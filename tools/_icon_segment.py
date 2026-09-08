import numpy as np
from PIL import Image
from scipy import ndimage

def fg_mask(im):
    a=np.array(im.convert("RGBA")); alpha=a[:,:,3]
    if alpha.min()<250:
        m=alpha>50
    else:
        rgb=a[:,:,:3].astype(int)
        m=~(((rgb>249).all(2)) | ((rgb<8).all(2)))
        m=ndimage.binary_opening(m, structure=np.ones((3,3)), iterations=2)
    m=ndimage.binary_opening(m, iterations=1)
    # remove tiny specks
    lab,n=ndimage.label(m)
    if n:
        sizes=ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
        keep=set(np.where(sizes>=25)[0]+1)
        m=np.isin(lab,list(keep))
    return m

def bands(occ, gap_frac=0.03, min_run=5):
    thr=max(1.0,occ.max()*gap_frac); on=occ>thr; segs=[]; s=None
    for i,v in enumerate(on):
        if v and s is None: s=i
        if (not v) and s is not None:
            if i-s>=min_run: segs.append((s,i))
            s=None
    if s is not None and len(on)-s>=min_run: segs.append((s,len(on)))
    return segs

def _trim(m,x0,y0,x1,y1):
    sub=m[y0:y1,x0:x1]
    if sub.sum()<40: return None
    ys,xs=np.where(sub); return (x0+int(xs.min()),y0+int(ys.min()),x0+int(xs.max())+1,y0+int(ys.max())+1)

def _perrow(m):
    out=[]
    for (y0,y1) in bands(m.sum(1),0.02,6):
        strip=m[y0:y1]
        for (x0,x1) in bands(strip.sum(0),0.04,5):
            c=_trim(m,x0,y0,x1,y1); 
            if c: out.append(c)
    return out
def _percol(m):
    out=[]
    for (x0,x1) in bands(m.sum(0),0.02,6):
        strip=m[:,x0:x1]
        for (y0,y1) in bands(strip.sum(1),0.04,5):
            c=_trim(m,x0,y0,x1,y1)
            if c: out.append(c)
    return _rowmajor(out)

def _rowmajor(cells):
    if not cells: return cells
    hs=sorted((c[3]-c[1]) for c in cells); med=hs[len(hs)//2]
    cells=sorted(cells,key=lambda c:c[1]); rows=[]; cur=[]; base=None
    for c in cells:
        cy=(c[1]+c[3])/2
        if base is None or cy-base<=med*0.6: cur.append(c); base=base if base is not None else cy
        else: rows.append(cur); cur=[c]; base=cy
    if cur: rows.append(cur)
    out=[]
    for r in rows: out+=sorted(r,key=lambda c:c[0])
    return out

def _uniform(m, cols, rows):
    ys,xs=np.where(m)
    if len(xs)==0: return []
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    cw=(x1-x0)/cols; rh=(y1-y0)/rows; out=[]
    for r in range(rows):
        for c in range(cols):
            cx0=int(x0+c*cw); cx1=int(x0+(c+1)*cw); cy0=int(y0+r*rh); cy1=int(y0+(r+1)*rh)
            t=_trim(m,cx0,cy0,cx1,cy1)
            out.append(t)   # keep None placeholders to preserve order
    return out

def grid_cells(im, expected=None, force=None):
    m=fg_mask(im)
    if force:                      # (cols,rows) uniform
        cells=[c for c in _uniform(m,*force) if c]; return cells,force[0],force[1]
    a=_perrow(m); b=_percol(m)
    cells = a if len(a)>=len(b) else b
    return cells, 0, 0
