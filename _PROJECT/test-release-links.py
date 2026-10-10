import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('links', Path(__file__).with_name('check-release-links.py'))
links = importlib.util.module_from_spec(spec)
spec.loader.exec_module(links)


class ReleaseLinksTests(unittest.TestCase):
    def test_visual_placeholder_and_invalid_svg_fail_even_when_every_url_exists(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / 'site.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('index.html', '<div class="visual-placeholder">Figure 1</div><img src="figure.svg">')
                z.writestr('figure.svg', '<svg xmlns="http://www.w3.org/2000/svg"><text><br></text></svg>')
            index = root / 'index.json'
            index.write_text(json.dumps([{'domain': 'pikov.expert', 'archivePath': str(archive)}]), encoding='utf-8')
            issues = links.audit(index)['issues']
            self.assertEqual(len(issues), 2)
            self.assertTrue(any(x['issue'] == 'unpublished visual placeholder' for x in issues))
            self.assertTrue(any(x['issue'].startswith('invalid SVG XML:') for x in issues))

    def test_markdown_checks_handout_links_but_not_local_lab_commands(self):
        text = '[Handout](../files/%D0%A4.pdf)\n[Lab](http://127.0.0.1:3000/)\n```sh\n[Example](missing.md)\n```\n`[code](missing.md)`\n[ref]: ../notes.md'
        self.assertEqual(list(links.markdown_references('https://dast.pikov.expert/practice/lab.md', text)), ['https://dast.pikov.expert/files/%D0%A4.pdf','https://dast.pikov.expert/notes.md'])

    def test_cross_origin_case_encoding_directory_and_local_targets(self):
        payload = {'pikov.expert': {'index.html', 'ru/index.html'}, 'dast.pikov.expert': {'index.html', 'downloads/Файл.pdf'}}
        self.assertIsNone(links.resolve_internal('https://pikov.expert/ru?lang=ru#catalog', payload))
        self.assertIsNone(links.resolve_internal('https://dast.pikov.expert/downloads/%D0%A4%D0%B0%D0%B9%D0%BB.pdf', payload))
        self.assertEqual(links.resolve_internal('https://dast.pikov.expert/downloads/файл.pdf', payload), 'missing file in release')
        self.assertEqual(links.resolve_internal('https://missing.pikov.expert/', payload), 'unmanaged site origin')
        self.assertEqual(links.resolve_internal('file:///V:/lecture.html', payload), 'link to a local machine')
        self.assertEqual(links.resolve_internal('http://127.0.0.1:8765/', payload), 'link to a local machine')
        self.assertIsNone(links.resolve_internal('https://example.org/missing', payload))

    def test_packaged_links_not_just_checkout_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / 'site.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('index.html', '<a href="missing.pdf">Download</a><script>const s=\'<a href="fake.html">\';</script><img src="ok.svg"><a href="https://extra.pikov.expert/">Extra</a>')
                z.writestr('ok.svg', '<svg/>')
            (root/'missing.pdf').write_bytes(b'checkout-only')
            index = root / 'index.json'
            index.write_text(json.dumps([{'domain':'pikov.expert','archivePath':str(archive)}]),encoding='utf-8')
            result = links.audit(index)
            self.assertEqual(len(result['issues']), 2)
            self.assertEqual({x['issue'] for x in result['issues']}, {'missing file in release', 'unmanaged site origin'})


if __name__ == '__main__':
    unittest.main()
