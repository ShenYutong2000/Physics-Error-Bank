from PIL import Image
from pathlib import Path
import math
src = Path(r"C:\Users\kathe\.cursor\projects\e-Physics-Error-Bank\assets\c__Users_kathe_AppData_Roaming_Cursor_User_workspaceStorage_9bf6b4ae65994a055d855a6b91edaae7_images_apple-6ae2da06-a3b9-406b-85d0-c894881d2b2a.png")
out = Path(r"e:\Physics-Error-Bank\public\branding\apple-logo.png")
out.parent.mkdir(parents=True, exist_ok=True)
img = Image.open(src).convert('RGBA')
pix = img.load(); w,h=img.size
# estimate blue background from corners
samples = [pix[3,3], pix[w-4,3], pix[3,h-4], pix[w-4,h-4], pix[w//2,3], pix[3,h//2], pix[w-4,h//2], pix[w//2,h-4]]
br = sum(s[0] for s in samples)/len(samples)
bg = sum(s[1] for s in samples)/len(samples)
bb = sum(s[2] for s in samples)/len(samples)
for y in range(h):
    for x in range(w):
        r,g,b,a = pix[x,y]
        d = math.sqrt((r-br)**2 + (g-bg)**2 + (b-bb)**2)
        # make background transparent, soft edge near threshold
        if d < 52:
            alpha = 0
        elif d < 78:
            alpha = int((d-52)/(78-52)*255)
        else:
            alpha = 255
        # preserve bright yellow stars strongly
        if r > 190 and g > 170 and b < 160:
            alpha = max(alpha, 245)
        pix[x,y] = (r,g,b,alpha)
# trim transparent border with padding
bbox = img.getbbox()
if bbox:
    l,t,r,b = bbox
    pad = 8
    l=max(0,l-pad); t=max(0,t-pad); r=min(w,r+pad); b=min(h,b+pad)
    img = img.crop((l,t,r,b))
img.save(out)
print('saved', out)
