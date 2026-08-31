import urllib.request
import re
html = urllib.request.urlopen("https://drive-master-2.onrender.com/admin").read().decode("utf-8")
match = re.search(r'src="(/assets/index-.*?\.js)"', html)
js_url = match.group(1)
js = urllib.request.urlopen("https://drive-master-2.onrender.com" + js_url).read().decode("utf-8")

# find the context around "baseURL"
idx = js.find('baseURL')
if idx != -1:
    print("baseURL context:", js[max(0, idx-50):idx+100])
else:
    print("baseURL not found")
