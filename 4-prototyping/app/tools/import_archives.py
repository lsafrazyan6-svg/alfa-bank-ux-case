"""Create offline, inert UI snapshots. Never copy bank scripts or original archives."""
import hashlib, json, plistlib, re, sys
from pathlib import Path
from urllib.parse import urljoin
try:
    from bs4 import BeautifulSoup, Comment, Doctype
except ImportError:
    sys.path.insert(0, '/private/tmp/alfa-import-libs')
    from bs4 import BeautifulSoup, Comment, Doctype

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'web'
ASSETS=OUT/'assets'
ASSETS.mkdir(parents=True,exist_ok=True)
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'
pages={'home':(' 8','Главная'),'benefits':('','Выгода'),'history':(' 3','История'),'tasks':(' 4','Задания и награды'),'task-shopping':(' 5','Задание на покупки'),'task-categories':(' 6','Задание на категории'),'task-balance':(' 7','Задание на остаток'),'cashback':(' 9','Выбор категорий'),'cashback-selected':(' 10','Выбранная категория'),'cashback-done':(' 11','Подтверждение')}
archives={name:plistlib.loads((SOURCE/f'Альфа-Банк{suffix}.webarchive').read_bytes()) for name,(suffix,_) in pages.items()}
resources={}
for arc in archives.values():
    for r in arc.get('WebSubresources',[]):
        mime=r.get('WebResourceMIMEType','')
        if mime=='text/css' or mime.startswith(('image/','font/')):
            url=r.get('WebResourceURL','');data=r.get('WebResourceData',b'')
            ext={'text/css':'.css','font/woff2':'.woff2','image/webp':'.webp','image/png':'.png','image/svg+xml':'.svg','image/jpeg':'.jpg'}.get(mime,'.bin')
            resources[url]=(hashlib.sha256(data).hexdigest()[:20]+ext,data,mime)

def rewrite_urls(text,base,css=False):
    def sub(m):
        url=m.group(1).strip(' \"\'')
        if url.startswith(('data:','#')):return m.group(0)
        r=resources.get(urljoin(base,url))
        if r:return 'url("'+('' if css else 'assets/')+r[0]+'")'
        return 'url("data:,")'
    return re.sub(r'url\(([^)]+)\)',sub,text)
for url,(filename,data,mime) in resources.items():
    if mime=='text/css':
        text=data.decode('utf-8',errors='replace')
        text=rewrite_urls(text,url,True)
        text=re.sub(r'prefers-color-scheme\s*:\s*dark', 'max-width: 0px', text)
        text=re.sub(r'@import\s+[\"\'][^;]+;', '',text)
        data=text.encode()
    (ASSETS/filename).write_bytes(data)

visual={'class','style','role','tabindex','width','height','viewbox','d','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','clip-rule','clip-path','opacity','transform','xmlns','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','points','offset','stop-color','stop-opacity','preserveaspectratio','gradientunits','gradienttransform','mask','filter','color','focusable','id','type','checked','disabled','data-test-id','data-gap-size','aria-current','aria-hidden','aria-expanded','data-layout','data-webview','data-position','data-sdui-side','data-devtools-swipe-zone','data-focus-guard','data-focus-lock-disabled'}
for name,arc in archives.items():
    main=arc['WebMainResource'];base=main.get('WebResourceURL','')
    soup=BeautifulSoup(main['WebResourceData'],'html.parser')
    for t in soup(['script','iframe','object','embed','base','noscript','form','textarea','foreignobject']):t.decompose()
    for t in soup.find_all('meta'):
        if t.get('name') not in ('viewport',):t.decompose()
    for t in soup.find_all('link'):
        if 'stylesheet' in t.get('rel',[]):
            r=resources.get(urljoin(base,t.get('href','')))
            if r:t.attrs={'rel':'stylesheet','href':'assets/'+r[0]}
            else:t.decompose()
        else:t.decompose()
    for t in soup.find_all(True):
        if t.name in ('link','meta','title'):continue
        orig=dict(t.attrs)
        t.attrs={k:v for k,v in orig.items() if k in visual}
        if 'data-test-id' in t.attrs:t['data-test-id']=re.sub(r'\d{7,}', 'demo', t['data-test-id'])
        if 'id' in t.attrs and re.search(r'\d{10,}',t['id']):t['id']='demo-id'
        if 'style' in t.attrs:t['style']=rewrite_urls(t['style'],base)
        if t.name=='img':
            r=resources.get(urljoin(base,orig.get('src','')))
            if r:t['src']='assets/'+r[0];t['alt']=''
            else:t.decompose();continue
        if t.name=='a':t['href']='#'
        if t.name=='input' and t.get('type')!='checkbox':t.decompose()
        if t.name=='style':t.string=re.sub(r'prefers-color-scheme\s*:\s*dark', 'max-width: 0px', rewrite_urls(t.get_text(),base))
    # Replace owner/account/transaction data with conspicuous demo values.
    for node in list(soup.find_all(string=True)):
        if isinstance(node, (Comment, Doctype)):
            if isinstance(node, Comment): node.extract()
            continue
        if node.parent.name in ('style','title'):continue
        txt=str(node)
        txt=re.sub(r'Лидия(?:\s+С\.)?|Сафразян(?:\s+Лидия\s+Леонидовна)?','Анна',txt)
        txt=re.sub(r'\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.', 'Алексей П.',txt)
        if '@' in txt:txt='demo@example.test'
        if name in ('home','history'):
            txt=re.sub(r'\d[\d \u2009\u205f\u00a0]{3,}[.,]?\d*', '50 000', txt)
            txt=re.sub(r',\d{2}', ',00', txt)
        node.replace_with(txt)
    for t in soup.select('[data-test-id="faq-button"]'):t.decompose()
    if soup.title:soup.title.string=pages[name][1]+' · Учебный прототип'
    else:
        t=soup.new_tag('title');t.string=pages[name][1]+' · Учебный прототип';soup.head.append(t)
    meta=soup.new_tag('meta');meta['http-equiv']='Content-Security-Policy';meta['content']="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'";soup.head.insert(0,meta)
    charset=soup.new_tag('meta',charset='utf-8');soup.head.insert(0,charset)
    css=soup.new_tag('link',rel='stylesheet',href='prototype.css');soup.head.append(css)
    script=soup.new_tag('script',src='prototype.js?v=2',defer=True);soup.head.append(script)
    soup.body['data-screen']=name
    (OUT/(('index' if name=='home' else name)+'.html')).write_text(str(soup))
(OUT/'screens.json').write_text(json.dumps([{ 'id':k,'title':v[1], 'file':('index' if k=='home' else k)+'.html'} for k,v in pages.items()],ensure_ascii=False,indent=2))
print(f'Imported {len(pages)} screens, {len(resources)} local visual resources; no bank JavaScript copied.')
