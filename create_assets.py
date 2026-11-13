from pathlib import Path
from random import Random
from math import sin, pi, exp
import wave, array
P=Path(__file__).parent/'assets';P.mkdir(exist_ok=True)
R=Random(41)
head='''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs>
<pattern id="stone" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#302e31"/><path d="M0 0H60V60H0Z M0 30H60 M30 0V30 M15 30V60" fill="none" stroke="#49454a" stroke-width="2"/><path d="M2 2L12 12 M45 42L55 39" stroke="#676064" stroke-width="1" opacity=".4"/></pattern>
<pattern id="dirt" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#34352c"/><path d="M0 20L50 16 M12 60L42 37" stroke="#494535" stroke-width="3" opacity=".3"/></pattern>
<radialGradient id="vign"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".48"/></radialGradient>
<filter id="blur"><feGaussianBlur stdDeviation="9"/></filter>
</defs><rect width="1200" height="800" fill="#191c21"/>'''
# dungeon usable broad connected stone rooms and corridors
p=[head]
p.append('<rect x="70" y="70" width="1060" height="650" rx="38" fill="#17171c" stroke="#715d49" stroke-width="12"/>')
rooms=[(110,370,450,285),(510,370,320,210),(480,100,350,210),(860,100,240,460)]
for x,y,w,h in rooms:
 p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="url(#stone)" stroke="#8b7357" stroke-width="23"/>')
 p.append(f'<rect x="{x+10}" y="{y+10}" width="{w-20}" height="{h-20}" fill="none" stroke="#19181b" stroke-width="4"/>')
# corridors floors over walls
for x,y,w,h in [(495,480,70,70),(645,280,70,110),(810,235,70,70)]:p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#stone)"/>')
# torches
for x,y in [(150,415),(515,145),(1040,140),(1030,510),(720,460),(385,610)]:
 p.append(f'<circle cx="{x}" cy="{y}" r="29" fill="#d98135" opacity=".23" filter="url(#blur)"/><circle cx="{x}" cy="{y}" r="7" fill="#efbb6f"/><path d="M{x-5} {y+10}L{x+4} {y-13}" stroke="#724e2d" stroke-width="5"/>')
# floor debris
for _ in range(90):
 x=R.randint(130,1080);y=R.randint(120,630)
 if any(a+18<x<a+w-18 and b+18<y<b+h-18 for a,b,w,h in rooms):
  p.append(f'<path d="M{x} {y}l{R.randint(-12,12)} {R.randint(2,10)}l{R.randint(1,9)} -{R.randint(1,12)}" fill="none" stroke="#a29b88" stroke-width="{R.choice([1,2,3])}" opacity=".34"/>')
# altar 
p.append('<circle cx="980" cy="320" r="89" fill="#29272f" stroke="#91694e" stroke-width="9"/><circle cx="980" cy="320" r="66" fill="none" stroke="#a4735c" stroke-width="4"/><path d="M980 261l50 85h-100Z M980 370l-47-82h94Z" stroke="#ab5d67" stroke-width="6" fill="none"/>')
# stairs
for y in range(490,610,14):p.append(f'<path d="M145 {y}h95" stroke="#5e5554" stroke-width="8"/>')
p.append('<rect width="1200" height="800" fill="url(#vign)"/><text x="60" y="46" font-family="serif" fill="#b8a17c" font-size="25" letter-spacing="7">CRIPTA SOB A VIGÍLIA</text></svg>')
(P/'dungeon.svg').write_text(''.join(p))
# village map
p=[head,'<rect width="1200" height="800" fill="url(#dirt)"/>']
# terrain patches
for _ in range(180):
 x,y=R.randint(15,1190),R.randint(25,790);p.append(f'<circle cx="{x}" cy="{y}" r="{R.randint(5,21)}" fill="{R.choice(["#494a38","#444d3b","#303e33","#4b4435"])}" opacity=".55"/>')
# cobblestone roads
p.append('<path d="M0 410 Q340 390 580 480 T1200 410" fill="none" stroke="#777365" stroke-width="108"/><path d="M580 0Q530 230 570 480L550 800" stroke="#777365" stroke-width="92" fill="none"/><path d="M0 410Q340 390 580 480T1200 410" fill="none" stroke="#a1987f" stroke-width="9" stroke-dasharray="19 26" opacity=".3"/>')
# 8 buildings roof + fences
buildings=[(105,100,210,160),(390,85,170,145),(700,95,190,160),(965,100,165,195),(115,525,220,165),(385,575,152,135),(730,552,170,158),(990,550,150,155)]
for i,(x,y,w,h) in enumerate(buildings):
 p.append(f'<rect x="{x-13}" y="{y-13}" width="{w+26}" height="{h+26}" fill="#202224" stroke="#716856" stroke-width="5"/>')
 p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{["#544a46","#5c4a42","#55565d","#4f4842"][i%4]}" stroke="#a08a75" stroke-width="7"/>')
 for xx in range(x+20,x+w-15,38):p.append(f'<path d="M{xx} {y+10}V{y+h-10}" stroke="#29262b" stroke-width="11" opacity=".58"/>')
 p.append(f'<path d="M{x} {y+h//2}H{x+w}" stroke="#ad9575" stroke-width="7"/>')
 p.append(f'<rect x="{x+w//2-14}" y="{y+h-6}" width="28" height="22" fill="#281b18"/>')
# well and wagons
p.append('<circle cx="590" cy="443" r="37" fill="#1b333e" stroke="#988d78" stroke-width="14"/><circle cx="590" cy="443" r="15" fill="#273c43"/><path d="M573 395L609 395" stroke="#beaa86" stroke-width="6"/>')
for x,y in [(310,455),(900,390)]:p.append(f'<rect x="{x}" y="{y}" width="62" height="31" rx="5" fill="#574837" stroke="#a3947b" stroke-width="3"/><circle cx="{x+12}" cy="{y+33}" r="10" fill="#252325" stroke="#a3947b" stroke-width="3"/><circle cx="{x+49}" cy="{y+33}" r="10" fill="#252325" stroke="#a3947b" stroke-width="3"/>')
for _ in range(60):
 x,y=R.randint(0,1200),R.randint(0,800)
 if not(80<x<1150 and (70<y<302 or 518<y<760 or 340<y<540)):
  p.append(f'<circle cx="{x}" cy="{y}" r="{R.randint(11,24)}" fill="#263d34" stroke="#4c5843" stroke-width="6"/>')
p.append('<rect width="1200" height="800" fill="url(#vign)"/><text x="60" y="46" font-family="serif" fill="#d2bb95" font-size="25" letter-spacing="7">POVOADO DE CORVAL</text></svg>')
(P/'village.svg').write_text(''.join(p))
# procedural sound effects, public-domain original recordings created mathematically, 16k mono
rate=16000
for key,dur in [('sino_cripta',1.7),('espada',.6),('vento_sombrio',3.2)]:
 n=int(rate*dur);buf=array.array('h')
 for i in range(n):
  t=i/rate
  if key=='sino_cripta':v=(sin(2*pi*510*t)*.65+sin(2*pi*765*t)*.24+sin(2*pi*1180*t)*.12)*exp(-t*2)
  elif key=='espada':v=(R.random()*2-1)*exp(-t*13)+.18*sin(2*pi*(700+2500*t)*t)*exp(-t*9)
  else:v=.2*(R.random()*2-1)+.16*sin(2*pi*67*t)+.12*sin(2*pi*124*t)
  buf.append(max(-32767,min(32767,int(v*16000))))
 with wave.open(str(P/(key+'.wav')),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(buf.tobytes())
print('assets',[(x.name,x.stat().st_size) for x in P.iterdir()])
