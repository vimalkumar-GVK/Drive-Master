import urllib.request
import re
html = urllib.request.urlopen("https://drive-master-2.onrender.com/admin").read().decode("utf-8")
match = re.search(r'src="(/assets/index-.*?\.js)"', html)
js_url = match.group(1)
js = urllib.request.urlopen("https://drive-master-2.onrender.com" + js_url).read().decode("utf-8")

matches = [m.start() for m in re.finditer(r'baseURL', js)]
for idx in matches:
    print("baseURL:", js[max(0, idx-20):idx+50])
