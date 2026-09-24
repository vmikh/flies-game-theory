"""Shared Python prototype of the MB simulator (mirrors src/sim.ts). Import from other scripts."""
import json, numpy as np, pandas as pd

class MB:
    def __init__(self, pn_kc=2.5, apl_kc=1.0, eta=0.15, norm_km=True, seed=1, base=0.275, kc_mbon=1.0):
        self.rng = np.random.default_rng(seed)
        meta = json.load(open('public/data/mb_R.json')); buf = open('public/data/mb_R.bin', 'rb').read()
        def arr(name):
            L = meta['layout'][name]; return np.frombuffer(buf, dtype=np.dtype(L['dtype']).newbyteorder('<'), count=L['length'], offset=L['offset'])
        self.meta = meta; self.n = n = meta['n']; CR = meta['class_ranges']
        self.cls = arr('cls'); self.sign = arr('sign').astype(np.float32); self.indptr = arr('indptr'); self.indices = arr('indices'); w = arr('weights').astype(np.float32)
        self.types = np.array(meta['types'])[arr('typ')]
        self.PN = np.arange(*CR['ALPN']); self.KC = np.arange(*CR['Kenyon_Cell']); self.MBON = np.arange(*CR['MBON']); self.DAN = np.arange(*CR['DAN']); self.APL = CR['APL'][0]
        r = lambda a: (lambda x: (x >= a[0]) & (x <= a[-1]))
        self.isKC, self.isPN, self.isMB, self.isDAN = r(self.KC), r(self.PN), r(self.MBON), r(self.DAN)
        self.pre = pre = np.repeat(np.arange(n), np.diff(self.indptr)); self.post = post = self.indices
        W = w * self.sign[pre] * base
        m_pk = self.isPN(pre) & self.isKC(post)
        tot = np.bincount(post[m_pk], weights=W[m_pk], minlength=n); med = np.median(tot[self.KC][tot[self.KC] > 0])
        W[m_pk] *= (med / np.maximum(tot, 1e-9))[post[m_pk]] * pn_kc
        m_km = self.isKC(pre) & self.isMB(post)
        if norm_km:
            tot = np.bincount(post[m_km], weights=W[m_km], minlength=n); med = np.median(tot[self.MBON][tot[self.MBON] > 0])
            W[m_km] *= (med / np.maximum(tot, 1e-9))[post[m_km]]
        W[m_km] *= kc_mbon
        W[self.isKC(pre) & self.isKC(post)] = 0; W[self.isPN(pre) & self.isPN(post)] = 0
        W[(pre == self.APL) & self.isKC(post)] *= apl_kc
        self.W = W.astype(np.float32); self.eta = eta
        self.pl_edges = np.where(m_km)[0]; self.plastic = np.ones(len(self.pl_edges), np.float32)
        self.pl_pre = pre[self.pl_edges] - self.KC[0]; self.pl_post = post[self.pl_edges] - self.MBON[0]
        comp = np.zeros((len(self.DAN), len(self.MBON)), np.float32)
        for k in np.where(self.isDAN(pre) & self.isMB(post))[0]: comp[pre[k]-self.DAN[0], post[k]-self.MBON[0]] += w[k]
        self.comp_raw = comp.copy(); self.comp = comp / (comp.sum(0, keepdims=True) + 1e-9)
        # glomeruli for odours
        uni = [i for i in self.PN if self.sign[i] > 0 and '_' in self.types[i] and not self.types[i].startswith('M_')]
        self.glom = {}
        for i in uni: self.glom.setdefault(self.types[i].split('_')[0], []).append(i)
        self.gl_names = sorted(self.glom)
        nodes = pd.read_feather('data/derived/mb_nodes_R.feather')
        nodes['ord'] = nodes['cls'].map({'ALPN':0,'Kenyon_Cell':1,'MBON':2,'DAN':3,'APL':4,'DPM':5}); nodes = nodes.sort_values(['ord','type','bodyId']).reset_index(drop=True)
        self.mb_nt = nodes.loc[self.MBON, 'nt'].fillna('').str.lower().to_numpy()
        self.PAM = self.DAN[np.char.startswith(self.types[self.DAN], 'PAM')]; self.PPL1 = self.DAN[np.char.startswith(self.types[self.DAN], 'PPL1')]
        self.V_REST, self.V_TH, self.V_RESET, self.TAU_M, self.TAU_SYN, self.REFRAC = -52.0, -45.0, -52.0, 20.0, 5.0, 2.0

    def make_odor(self, frac=0.25):
        g = self.rng.choice(self.gl_names, size=max(1, int(frac*len(self.gl_names))), replace=False)
        return np.array(sorted(sum((self.glom[x] for x in g), [])))

    def run(self, odor_pn, T=400, dan_drive=None, dan_rate=0.15, learn=False, odor_rate=0.10, kick=12.0, dan_from=50):
        n = self.n; rng = self.rng; W = self.W; Weff = W.copy(); indptr, indices = self.indptr, self.indices
        v = np.full(n, self.V_REST, np.float32); I = np.zeros(n, np.float32); ref = np.zeros(n, np.float32); spikes = np.zeros(n, np.int32); tr = np.zeros(len(self.KC), np.float32)
        for t in range(T):
            I[odor_pn] += (rng.random(len(odor_pn)) < odor_rate) * kick
            if dan_drive is not None and t > dan_from: I[dan_drive] += (rng.random(len(dan_drive)) < dan_rate) * kick
            v += ((self.V_REST - v) / self.TAU_M + I / self.TAU_SYN) * (ref <= 0); I -= I / self.TAU_SYN; ref -= 1
            fired = np.where(v >= self.V_TH)[0]
            if len(fired):
                v[fired] = self.V_RESET; ref[fired] = self.REFRAC; spikes[fired] += 1
                Weff[self.pl_edges] = W[self.pl_edges] * self.plastic
                for i in fired:
                    s, e = indptr[i], indptr[i+1]
                    if e > s: np.add.at(I, indices[s:e], Weff[s:e])
                kf = fired[self.isKC(fired)] - self.KC[0]; tr[kf] += 1
                if learn and dan_drive is not None:
                    df = fired[np.isin(fired, dan_drive)] - self.DAN[0]
                    if len(df):
                        d = self.comp[df].sum(0); self.plastic = np.maximum(0.05, self.plastic - self.eta * tr[self.pl_pre] * d[self.pl_post] * self.plastic)
            tr *= np.exp(-1/200)
        return spikes
