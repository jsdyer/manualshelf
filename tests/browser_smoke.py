"""Exercise the built app at a project path; controlled source fixtures are test-only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, os, shutil, tempfile, threading
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def main():
    screenshots=ROOT/'browser-checks'; screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        shutil.copytree(ROOT/'dist',Path(temp)/'manualshelf')
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=temp))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
                page=browser.new_page(viewport={'width':1280,'height':1000}); errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                docs=[{'identifier':'camera-1','title':'Camera ZX900 user manual','creator':'Fixture manufacturer','year':'1997'}, {'identifier':'camera-2','title':'Camera ZX900 service manual','year':'1998'}]
                page.route('https://archive.org/advancedsearch.php*',lambda r:r.fulfill(json={'response':{'numFound':2,'docs':docs}}))
                page.route('https://archive.org/metadata/*',lambda r:r.fulfill(json={'metadata':next(d for d in docs if d['identifier']==r.request.url.rsplit('/',1)[-1]),'files':[{'name':'original.pdf','format':'Text PDF','source':'original','size':'1234'}]}))
                page.route('https://archive.org/services/img/*',lambda r:r.abort())
                page.route('https://coolcode.ca/**',lambda r:r.abort())
                url=f'http://127.0.0.1:{server.server_port}/manualshelf/'
                page.goto(url); page.locator('#query').fill('Arbitrary ZX900');page.get_by_role('button',name='Search archive',exact=True).click()
                expect(page.locator('#results .card')).to_have_count(2)
                page.get_by_role('button',name='Inspect files').first.click()
                expect(page.locator('#detail a').filter(has_text='Text PDF')).to_have_attribute('href','https://archive.org/download/camera-1/original.pdf')
                page.locator('#equipment').fill('My kitchen camera');page.locator('#notes').fill('=notes stay local\nrevision 2')
                page.get_by_role('button',name='Save to my cabinet').click();expect(page.locator('#detail-status')).to_contain_text('Saved on this device')
                page.locator('#results').get_by_role('button',name='Compare',exact=True).first.click()
                page.locator('#results').get_by_role('button',name='Compare',exact=True).click()
                page.locator('[data-tab="compare"]').click();expect(page.locator('#comparison table')).to_be_visible()
                page.locator('[data-tab="cabinet"]').click();expect(page.locator('#cabinet .card')).to_have_count(1)
                with page.expect_download() as dl: page.locator('#export-json').click()
                exported=json.loads(Path(dl.value.path()).read_text());assert exported['items'][0]['notes'].startswith('=notes stay local')
                page.locator('#import').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{}'})
                expect(page.locator('#cabinet-status')).to_contain_text('Import failed')
                new={'schema':'manualshelf.cabinet.v1','items':[{'id':'unlisted-extra-93','title':'Unlisted equipment guide','equipment':'Workshop'}]}
                page.locator('#import').set_input_files({'name':'extra.json','mimeType':'application/json','buffer':json.dumps(new).encode()})
                expect(page.locator('#cabinet .card')).to_have_count(2);expect(page.locator('#cabinet-status')).to_contain_text('Imported 1')
                page.reload();page.locator('[data-tab="cabinet"]').click();expect(page.locator('#cabinet .card')).to_have_count(2)
                page.locator('#cabinet-filter').fill('Kitchen');expect(page.locator('#cabinet .card')).to_have_count(1)
                page.screenshot(path=str(screenshots/'desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                page.screenshot(path=str(screenshots/'mobile.png'),full_page=True)
                page.route('https://archive.org/advancedsearch.php*',lambda r:r.fulfill(status=503,body='unavailable'))
                page.locator('[data-tab="search"]').click();page.get_by_role('button',name='Search archive',exact=True).click();expect(page.locator('#search-status')).to_contain_text('HTTP 503')
                assert not errors,errors;browser.close()
            print('Browser checks passed: arbitrary query, files, local cabinet persistence/import/export, compare, errors, mobile')
        finally: server.shutdown()
if __name__=='__main__':main()
