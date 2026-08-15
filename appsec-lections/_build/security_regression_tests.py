"""Static regression contract for bounded, reusable training materials."""

from pathlib import Path
from datetime import date
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
APPSEC = ROOT / "appsec-lections"
JUICE_COMPOSE = APPSEC / "lab" / "juice-shop" / "compose.yaml"
OLD_LAB = (
    APPSEC
    / "downloads"
    / "day-01"
    / "participant-materials"
    / "Training Lab - Материалы для участников"
    / "md"
    / "4. Лабник. Безопасность приложений.md"
)


class CanonicalJuiceShopLabTests(unittest.TestCase):
    def assert_foreign_compose_project_is_not_deleted(self, stop_script: Path) -> None:
        """A same-name foreign Compose project must be rejected before `down`."""
        with tempfile.TemporaryDirectory(prefix="appsec-compose-collision-") as temp_name:
            temp = Path(temp_name)
            fake_log = temp / "docker-commands.log"
            fake_docker = temp / "docker.cmd"
            fake_docker.write_text(
                "@echo off\r\n"
                "echo %*>>\"%DOCKER_FAKE_LOG%\"\r\n"
                "if \"%1\"==\"ps\" (echo foreign-container& exit /b 0)\r\n"
                "if \"%1\"==\"container\" if \"%2\"==\"inspect\" "
                "(echo [{\"Config\":{\"Labels\":{\"expert.pikov.lab\":\"foreign\","
                "\"expert.pikov.config\":\"foreign\"}}}]& exit /b 0)\r\n"
                "exit /b 0\r\n",
                encoding="ascii",
            )
            env = os.environ.copy()
            env["PATH"] = str(temp) + os.pathsep + env.get("PATH", "")
            env["DOCKER_FAKE_LOG"] = str(fake_log)
            result = subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(stop_script),
                ],
                cwd=stop_script.parent,
                env=env,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=30,
                check=False,
            )
            commands = fake_log.read_text(encoding="utf-8", errors="replace") if fake_log.exists() else ""
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("foreign", (result.stdout + result.stderr).lower())
        command_lines = [line.strip().lower() for line in commands.splitlines() if line.strip()]
        self.assertFalse(any(line.startswith("compose ") for line in command_lines), commands)

    def assert_builder_rejects_stray_file(self, builder: Path, directory: Path) -> None:
        # Never place a mutation fixture in the shared checkout: a concurrent
        # release/reviewer must not observe a transient secret-like file, and
        # interruption of the test process must not leave one behind.
        with tempfile.TemporaryDirectory(prefix="appsec-builder-stray-") as temp_name:
            temp = Path(temp_name)
            site = temp / "appsec-lections"
            for relative in (
                Path("downloads/day-01"),
                Path("downloads/day-02"),
                Path("materials"),
                Path("lab"),
            ):
                shutil.copytree(
                    APPSEC / relative,
                    site / relative,
                    ignore=shutil.ignore_patterns("*.zip", "__pycache__"),
                )
            (site / "_build").mkdir(parents=True)
            for builder_name in ("build-materials-zip.ps1", "build-day-02-materials.ps1"):
                shutil.copy2(APPSEC / "_build" / builder_name, site / "_build" / builder_name)

            temp_builder = site / "_build" / builder.name
            temp_directory = site / directory.relative_to(APPSEC)
            stray = temp_directory / ".release-regression.env"
            self.assertFalse(stray.exists(), f"test collision: {stray}")
            stray.write_text("SHOULD_NOT_SHIP=1\n", encoding="utf-8")
            try:
                result = subprocess.run(
                    [
                        "pwsh",
                        "-NoProfile",
                        "-ExecutionPolicy",
                        "Bypass",
                        "-File",
                        str(temp_builder),
                    ],
                    cwd=temp,
                    encoding="utf-8",
                    errors="replace",
                    capture_output=True,
                    timeout=60,
                    check=False,
                )
            finally:
                stray.unlink(missing_ok=True)
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Unexpected public source file", result.stdout + result.stderr)

    def test_day_one_builder_rejects_reparse_author_material(self) -> None:
        author_names = (
            "день-1-методический-конспект.md",
            "день-1-слайды-AppSec-OWASP-и-ИИ.md",
            "источники-и-версии.md",
            "каталог-материалов-дня-1.md",
            "методика-преподавателя-день-1.md",
            "права-и-атрибуция.md",
            "практикум-безопасность-приложений-методичка.md",
            "чек-лист-слушателя.md",
            "шаблон-отчёта-лабораторной-работы.md",
        )
        with tempfile.TemporaryDirectory(prefix="appsec-day1-reparse-") as temp_name:
            temp = Path(temp_name)
            site = temp / "appsec-lections"
            (site / "_build").mkdir(parents=True)
            shutil.copy2(APPSEC / "_build" / "build-materials-zip.ps1", site / "_build")
            shutil.copytree(APPSEC / "downloads" / "day-01" / "transcripts", site / "downloads" / "day-01" / "transcripts")
            shutil.copytree(APPSEC / "lab" / "juice-shop", site / "lab" / "juice-shop")
            materials = site / "materials"
            materials.mkdir()
            for name in author_names[1:]:
                shutil.copy2(APPSEC / "materials" / name, materials / name)
            secret = temp / "outside-secret.md"
            secret.write_text("SECRET_MUST_NOT_SHIP\n", encoding="utf-8")
            os.symlink(secret, materials / author_names[0])

            result = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(site / "_build" / "build-materials-zip.ps1")],
                cwd=temp,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Day 1 author material must not be a reparse point", result.stdout + result.stderr)

    def test_day_two_builder_rejects_reparse_author_material(self) -> None:
        author_names = (
            "день-2-методический-конспект.md",
            "практикум-день-2-набор-заданий.md",
            "источники-и-версии-день-2.md",
            "день-2-веб-слайды-AppSec-SSDLC-и-ИИ.md",
        )
        with tempfile.TemporaryDirectory(prefix="appsec-day2-reparse-") as temp_name:
            temp = Path(temp_name)
            site = temp / "appsec-lections"
            (site / "_build").mkdir(parents=True)
            shutil.copy2(APPSEC / "_build" / "build-day-02-materials.ps1", site / "_build")
            shutil.copytree(APPSEC / "downloads" / "day-02" / "transcripts", site / "downloads" / "day-02" / "transcripts")
            shutil.copytree(APPSEC / "downloads" / "day-02" / "participant-materials", site / "downloads" / "day-02" / "participant-materials")
            materials = site / "materials"
            materials.mkdir()
            for name in author_names[1:]:
                shutil.copy2(APPSEC / "materials" / name, materials / name)
            secret = temp / "outside-secret.md"
            secret.write_text("SECRET_MUST_NOT_SHIP\n", encoding="utf-8")
            os.symlink(secret, materials / author_names[0])

            result = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(site / "_build" / "build-day-02-materials.ps1")],
                cwd=temp,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Day 2 author material must not be a reparse point", result.stdout + result.stderr)

    def test_day_one_builder_fails_closed_on_an_unreviewed_file(self) -> None:
        self.assert_builder_rejects_stray_file(
            APPSEC / "_build" / "build-materials-zip.ps1",
            APPSEC / "downloads" / "day-01" / "transcripts",
        )

    def test_day_two_builder_fails_closed_on_an_unreviewed_file(self) -> None:
        self.assert_builder_rejects_stray_file(
            APPSEC / "_build" / "build-day-02-materials.ps1",
            APPSEC / "downloads" / "day-02" / "participant-materials",
        )

    def test_compose_closes_the_lab_boundary(self) -> None:
        text = JUICE_COMPOSE.read_text(encoding="utf-8")
        required = (
            "bkimminich/juice-shop@sha256:",
            "alpine@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b",
            '127.0.0.1:3000:8080',
            "loopback-proxy:",
            'command: ["nc", "-lk", "-p", "8080", "-e", "nc", "juice-shop", "3000"]',
            "pull_policy: never",
            'restart: "no"',
            "internal: true",
            "com.docker.network.bridge.gateway_mode_ipv4: isolated",
            "cap_drop:",
            "- ALL",
            "no-new-privileges:true",
            "pids_limit:",
            "mem_limit:",
            "cpus:",
            "healthcheck:",
            "condition: service_healthy",
        )
        for marker in required:
            with self.subTest(marker=marker):
                self.assertIn(marker, text)

        app_block = text.split("  juice-shop:", 1)[1].split("  loopback-proxy:", 1)[0]
        self.assertNotIn("ports:", app_block, "the vulnerable app must not publish a host port")
        self.assertEqual(1, text.count("    ports:"), "only the loopback proxy may publish a port")
        for forbidden in ("0.0.0.0:", "privileged:", "network_mode: host", "/var/run/docker.sock"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, text)
        self.assertEqual("- isolated", app_block.split("networks:", 1)[1].split("cap_drop:", 1)[0].strip())
        self.assertIn("ingress:", text)
        self.assertIn("com.docker.network.bridge.host_binding_ipv4: 127.0.0.1", text)

        practice = (APPSEC / "practice.html").read_text(encoding="utf-8")
        self.assertIn("lab/juice-shop/compose.yaml", practice)
        self.assertIn("lab/juice-shop/start.ps1", practice)
        self.assertIn("lab/juice-shop/stop.ps1", practice)
        for obsolete_command in ("docker pull ", "docker run ", "&lt;проверенный-тег&gt;"):
            with self.subTest(obsolete_command=obsolete_command):
                self.assertNotIn(obsolete_command, practice)
        for unsafe_shortcut in (
            "docker compose -f appsec-lections/lab/juice-shop/compose.yaml up",
            "docker compose -f appsec-lections/lab/juice-shop/compose.yaml down",
            "port juice-shop 3000",
        ):
            with self.subTest(unsafe_shortcut=unsafe_shortcut):
                self.assertNotIn(unsafe_shortcut, practice)

        readme = (APPSEC / "lab" / "juice-shop" / "README.md").read_text(encoding="utf-8")
        self.assertIn("Docker Engine 28.0.0", readme)

    def test_day_one_wrappers_validate_ownership_before_cleanup(self) -> None:
        lab = APPSEC / "lab" / "juice-shop"
        compose = (lab / "compose.yaml").read_text(encoding="utf-8")
        readme = (lab / "README.md").read_text(encoding="utf-8")
        start = (lab / "start.ps1").read_text(encoding="utf-8")
        stop = (lab / "stop.ps1").read_text(encoding="utf-8")
        for marker in ("expert.pikov.lab", "expert.pikov.config"):
            self.assertIn(marker, compose)
            self.assertIn(marker, stop)
        self.assertIn("& $StopScript -ValidateOnly", start)
        self.assertLess(stop.index("\nAssert-OwnedProjectObjects\nif"), stop.index("'down'"))
        self.assertIn(".\\start.ps1", readme)
        self.assertIn(".\\stop.ps1", readme)
        self.assertNotIn("docker compose -f compose.yaml down", readme)
        self.assert_foreign_compose_project_is_not_deleted(lab / "stop.ps1")

    def test_public_pages_offer_only_the_canonical_day_one_package(self) -> None:
        unsafe_archives = (
            "day-01-public-materials.zip",
            "day-01-laboratory-materials-and-reports.zip",
        )
        pages = [
            APPSEC / "index.html",
            APPSEC / "day-01.html",
            APPSEC / "practice.html",
            APPSEC / "rights.html",
            APPSEC / "materials" / "каталог-материалов-дня-1.md",
        ]
        for page in pages:
            text = page.read_text(encoding="utf-8")
            for archive in unsafe_archives:
                with self.subTest(page=page.name, archive=archive):
                    self.assertNotRegex(
                        text,
                        rf'href=["\'][^"\']*{re.escape(archive)}|\]\([^)]*{re.escape(archive)}',
                    )

        canonical_assets = (
            "day-01-canonical-safe-package.zip",
            "day-01-SHA256SUMS.md",
            "day-01-manifest.json",
        )
        for page in (pages[0], pages[1], pages[3], pages[4]):
            text = page.read_text(encoding="utf-8")
            for asset in canonical_assets:
                with self.subTest(page=page.name, asset=asset):
                    self.assertRegex(
                        text,
                        rf'href=["\'][^"\']*{re.escape(asset)}|\]\([^)]*{re.escape(asset)}',
                    )

        public_claims = "\n".join(
            (APPSEC / name).read_text(encoding="utf-8")
            for name in ("index.html", "day-01.html", "materials/каталог-материалов-дня-1.md")
        )
        for obsolete_claim in (
            "Заполненный пример карточки входит в",
            "Для пакетов опубликованы контрольные суммы",
            "программа, учебный пакет и результаты выполненных лабораторных работ",
            "программа, учебные документы, слайды и\nрезультаты лабораторных работ",
        ):
            with self.subTest(obsolete_claim=obsolete_claim):
                self.assertNotIn(obsolete_claim, public_claims)

    def test_legacy_markdown_contains_no_resource_exhaustion_or_host_escape_recipe(self) -> None:
        text = OLD_LAB.read_text(encoding="utf-8")
        forbidden = (
            "a: &a [",
            'requests.get(url',
            '"8080:8080"',
            "(void)system(",
            "A'*64 + 'id",
        )
        for marker in forbidden:
            with self.subTest(marker=marker):
                self.assertNotIn(marker, text)

    def test_release_cannot_republish_quarantined_day_one_archives(self) -> None:
        unsafe_archives = (
            "day-01-public-materials.zip",
            "day-01-laboratory-materials-and-reports.zip",
        )
        canonical_indexes = ("day-01-SHA256SUMS.md", "day-01-manifest.json")
        builder = (APPSEC / "_build" / "build-materials-zip.ps1").read_text(encoding="utf-8")
        release_builder = (ROOT / "_PROJECT" / "build-release.ps1").read_text(encoding="utf-8")
        allowlist = re.search(
            r"\$script:ReviewedNestedDistributables\s*=\s*@\{.*?"
            r"'appsec-lections'\s*=\s*@\((?P<body>.*?)\n\s*\)",
            release_builder,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(allowlist)
        for filename in (*unsafe_archives, *canonical_indexes):
            with self.subTest(filename=filename):
                self.assertIn(filename, builder)
        for filename in unsafe_archives:
            with self.subTest(filename=filename):
                self.assertNotIn(filename, allowlist.group("body"))
                self.assertFalse((APPSEC / "downloads" / filename).exists())
        for filename in (
            "day-01-edited-transcript-and-summaries.zip",
            "day-01-canonical-safe-package.zip",
            "day-01-SHA256SUMS.md",
            "day-01-manifest.json",
            "lab\\juice-shop\\README.md",
        ):
            with self.subTest(filename=filename):
                self.assertIn(filename, allowlist.group("body"))

        for archive in (APPSEC / "release").glob("appsec-lections.pikov.expert-release-*.zip"):
            with zipfile.ZipFile(archive) as package:
                names = {Path(name.replace("\\", "/")).name for name in package.namelist()}
            for filename in unsafe_archives:
                with self.subTest(archive=archive.name, filename=filename):
                    self.assertNotIn(filename, names)

        safe_package = APPSEC / "downloads" / "day-01-canonical-safe-package.zip"
        with zipfile.ZipFile(safe_package) as package:
            safe_names = {name.replace("\\", "/") for name in package.namelist() if not name.endswith("/")}
        for required in (
            "lab/juice-shop/compose.yaml",
            "lab/juice-shop/README.md",
            "lab/juice-shop/start.ps1",
            "lab/juice-shop/stop.ps1",
        ):
            with self.subTest(required=required):
                self.assertIn(required, safe_names)
        self.assertFalse(
            {name for name in safe_names if Path(name).suffix.lower() in {".doc", ".docx", ".pdf", ".exe"}}
        )
        manifest = json.loads((APPSEC / "downloads" / "day-01-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(safe_names, {item["path"] for item in manifest["files"]})

    def test_release_quarantines_legacy_day_one_source_directories(self) -> None:
        release_builder = (ROOT / "_PROJECT" / "build-release.ps1").read_text(encoding="utf-8")
        quarantined = (
            r"downloads\day-01\lab-results",
            r"downloads\day-01\participant-materials",
            r"downloads\day-01\program-and-environment",
        )
        self.assertIn("QuarantinedNestedDirectories", release_builder)
        for relative_dir in quarantined:
            with self.subTest(relative_dir=relative_dir):
                self.assertIn(relative_dir, release_builder)

        for archive in (APPSEC / "release").glob("appsec-lections.pikov.expert-release-*.zip"):
            with zipfile.ZipFile(archive) as package:
                names = {name.replace("/", "\\") for name in package.namelist()}
            for relative_dir in quarantined:
                prefix = relative_dir + "\\"
                with self.subTest(archive=archive.name, relative_dir=relative_dir):
                    self.assertFalse(any(name.startswith(prefix) for name in names))


class SsrfFixtureTests(unittest.TestCase):
    @staticmethod
    def fixture_root() -> Path:
        return (
            APPSEC
            / "downloads"
            / "day-02"
            / "participant-materials"
            / "lr-ssrf"
        )

    def test_every_service_has_runtime_limits(self) -> None:
        compose = (self.fixture_root() / "docker-compose.yml").read_text(encoding="utf-8")
        for service in ("gateway", "app", "internal"):
            block = re.search(
                rf"^  {service}:\n(?P<body>.*?)(?=^  [a-z][\w-]*:|^networks:)",
                compose,
                flags=re.MULTILINE | re.DOTALL,
            )
            self.assertIsNotNone(block, service)
            for marker in ("pids_limit:", "mem_limit:", "cpus:"):
                with self.subTest(service=service, marker=marker):
                    self.assertIn(marker, block.group("body"))
        self.assertIn("com.docker.network.bridge.host_binding_ipv4: 127.0.0.1", compose)
        self.assertIn("com.docker.network.bridge.gateway_mode_ipv4: isolated", compose)

    def test_all_python_images_are_pinned_to_one_verified_digest(self) -> None:
        from_lines = []
        for service in ("gateway", "app", "internal"):
            dockerfile = (self.fixture_root() / service / "Dockerfile").read_text(encoding="utf-8")
            match = re.search(
                r"^FROM python:3\.12-alpine@sha256:([0-9a-f]{64})$",
                dockerfile,
                flags=re.MULTILINE,
            )
            self.assertIsNotNone(match, service)
            from_lines.append(match.group(1))
        self.assertEqual(1, len(set(from_lines)), "all three services must use the same verified base image")

    def test_alternate_host_port_is_used_by_the_demo_request(self) -> None:
        readme = (self.fixture_root() / "README.md").read_text(encoding="utf-8")
        start = (self.fixture_root() / "start.ps1").read_text(encoding="utf-8")
        self.assertIn("$LabPort", readme)
        self.assertIn("http://127.0.0.1:$LabPort/fetch", readme)
        self.assertNotIn("-Uri 'http://127.0.0.1:8080/fetch'", readme)
        self.assertIn("Docker Engine 28.0.0", readme)
        self.assertIn("-lt 28", start)
        self.assertIn("'config', '--quiet'", start)
        self.assertIn(".\\start.ps1 -LabPort 8080", readme)

    def test_readme_describes_the_actual_three_service_flow(self) -> None:
        readme = (self.fixture_root() / "README.md").read_text(encoding="utf-8")
        self.assertNotIn("двухконтейнерный", readme)
        self.assertIn("браузер → gateway → app → internal", readme)

    def test_public_pages_describe_and_link_the_complete_three_service_fixture(self) -> None:
        practice = (APPSEC / "practice.html").read_text(encoding="utf-8")
        teachers = (APPSEC / "for-teachers.html").read_text(encoding="utf-8")
        deck = (APPSEC / "assets" / "day-02-reconstructed-slides.js").read_text(encoding="utf-8")
        slides = (APPSEC / "materials" / "день-2-веб-слайды-AppSec-SSDLC-и-ИИ.md").read_text(encoding="utf-8")
        protocol = (
            APPSEC / "downloads" / "day-02" / "transcripts" / "Протокол-дня-02-редактированный.md"
        ).read_text(encoding="utf-8")

        for label, text in {
            "practice": practice,
            "deck": deck,
            "slides": slides,
            "protocol": protocol,
        }.items():
            with self.subTest(label=label):
                self.assertNotRegex(text, r"двухконтейнер|из двух контейнер|два контейнера")
                self.assertRegex(text, r"тр[ёе]х(?:сервис| контейнер)")

        package_href = 'href="downloads/day-02-laboratory-materials.zip"'
        self.assertIn(package_href, practice)
        self.assertIn(package_href, teachers)
        self.assertNotIn(
            'href="downloads/day-02/participant-materials/lr-ssrf/README.md"',
            practice + teachers,
        )

    def test_public_package_descriptions_match_the_actual_archive_contents(self) -> None:
        index = (APPSEC / "index.html").read_text(encoding="utf-8")
        day_two = (APPSEC / "day-02.html").read_text(encoding="utf-8")
        self.assertIn("отредактированные стенограммы, протокол и пересказы", index)
        self.assertIn("Markdown-версия веб‑колоды", day_two)
        self.assertNotIn("Стенограмма, конспект, веб‑колода, практикум", day_two)

    def test_ssrf_wrappers_validate_ownership_before_cleanup(self) -> None:
        lab = self.fixture_root()
        compose = (lab / "docker-compose.yml").read_text(encoding="utf-8")
        readme = (lab / "README.md").read_text(encoding="utf-8")
        start = (lab / "start.ps1").read_text(encoding="utf-8")
        stop = (lab / "stop.ps1").read_text(encoding="utf-8")
        self.assertIn("name: appsec-day2-ssrf", compose)
        for marker in ("expert.pikov.lab", "expert.pikov.config"):
            self.assertIn(marker, compose)
            self.assertIn(marker, stop)
        self.assertIn("& $StopScript -ValidateOnly", start)
        self.assertLess(stop.index("\nAssert-OwnedProjectObjects\nif"), stop.index("'down'"))
        self.assertIn(".\\start.ps1", readme)
        self.assertIn(".\\stop.ps1", readme)
        self.assertNotIn("docker compose down --volumes", readme)
        CanonicalJuiceShopLabTests().assert_foreign_compose_project_is_not_deleted(lab / "stop.ps1")


class AiTaxonomyTests(unittest.TestCase):
    def test_ai_section_is_versioned_and_avoids_absolute_claim(self) -> None:
        html = (APPSEC / "day-01.html").read_text(encoding="utf-8")
        slides = (APPSEC / "materials" / "день-1-слайды-AppSec-OWASP-и-ИИ.md").read_text(encoding="utf-8")
        deck = (APPSEC / "assets" / "day-01-reconstructed-slides.js").read_text(encoding="utf-8")
        self.assertNotIn("Языковая модель не создаёт новый вид уязвимостей", html)
        self.assertNotIn("Языковая модель не добавляет новых классов уязвимостей", slides)
        self.assertNotIn("Совпадение почти полное", deck)
        for marker in ("LLM01:2025", "LLM10:2025", "Agentic Applications 2026", "AISVS 1.0"):
            with self.subTest(marker=marker):
                self.assertIn(marker, html)
                self.assertIn(marker, slides)
                self.assertIn(marker, deck)


class AstraIntroSafetyTests(unittest.TestCase):
    def test_update_flow_keeps_repository_trust_and_recovery_boundary(self) -> None:
        paths = (
            ROOT / "astra-intro" / "materials.md",
            ROOT / "astra-intro" / "index.html",
        )
        materials = paths[0].read_text(encoding="utf-8")
        html = paths[1].read_text(encoding="utf-8")
        for path, text in ((paths[0], materials), (paths[1], html)):
            with self.subTest(path=path.name):
                self.assertNotIn("[trusted=yes]", text)

        for marker in ("снимок до обновления", "подписи репозитория", "обычной учётной записью"):
            with self.subTest(marker=marker):
                self.assertIn(marker, materials.lower())

        for marker in ("официальн", "отпечат", "stop", "снимок"):
            with self.subTest(marker=marker):
                self.assertIn(marker, html.lower())

        for marker in ("frozen-профил", "не является утверждением о последнем", "перед каждым проведением"):
            with self.subTest(marker=marker):
                self.assertIn(marker, html.lower())

    def test_virtualbox_privileged_install_is_gated_by_independent_integrity_evidence(self) -> None:
        html = (ROOT / "astra-intro" / "index.html").read_text(encoding="utf-8")
        section = html[html.index("VirtualBox и Extension Pack") : html.index("§3.1 Создание ВМ")]
        for marker in (
            "https://www.virtualbox.org",
            "$ExpectedVirtualBoxSha256",
            "$ExpectedExtensionPackSha256",
            "$ExpectedPublisher",
            "Get-FileHash",
            "Get-AuthenticodeSignature",
            "независимому аутентифицированному каналу",
            "STOP:",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        self.assertLess(section.index("Get-FileHash"), section.index("Установить VirtualBox"))
        self.assertLess(section.index("Get-AuthenticodeSignature"), section.index("Установить VirtualBox"))

    def test_install_media_and_frozen_update_result_are_not_conflated(self) -> None:
        materials = (ROOT / "astra-intro" / "materials.md").read_text(encoding="utf-8")
        html = (ROOT / "astra-intro" / "index.html").read_text(encoding="utf-8")
        forbidden = "установленной и обновлённой Astra Linux SE 1.7.4"
        self.assertNotIn(forbidden, materials)
        self.assertNotIn(forbidden, html)
        for text in (materials, html):
            for marker in ("установ", "1.7.4", "frozen-профил", "1.7.10.72"):
                with self.subTest(marker=marker):
                    self.assertIn(marker, text)
        self.assertNotIn("актуальное кумулятивное состояние", html.lower())
        self.assertNotIn("на дату курса", html.lower())


class KomradSafetyTests(unittest.TestCase):
    def test_network_and_destructive_event_flow_are_bounded(self) -> None:
        docs = ROOT / "komrad" / "docs"
        paths = [ROOT / "komrad" / "index.html", *docs.glob("*.md")]
        joined = "\n".join(path.read_text(encoding="utf-8") for path in paths)
        self.assertNotIn("Сетевой мост", joined)
        self.assertIn("$LabUser", joined)
        self.assertIn("wevtutil epl Security", joined)
        self.assertIn("wevtutil cl Security", joined)
        self.assertLess(joined.index("wevtutil epl Security"), joined.index("wevtutil cl Security"))
        self.assertIn("снимок", joined.lower())
        self.assertIn("net user $LabUser /delete", joined)

        for relative_path in (
            "02-virtualbox-komrad-stand.md",
            "03-practice-variants.md",
        ):
            with self.subTest(relative_path=relative_path):
                text = (docs / relative_path).read_text(encoding="utf-8")
                for marker in (
                    "$LabUserCreated = $false",
                    "$CreateExitCode = $LASTEXITCODE",
                    "$LabUserCreated = $true",
                    "$EvidencePath",
                    "$ExportExitCode = $LASTEXITCODE",
                    "Test-Path -LiteralPath $EvidencePath -PathType Leaf",
                    "(Get-Item -LiteralPath $EvidencePath).Length -le 0",
                    "Get-FileHash -LiteralPath $EvidencePath -Algorithm SHA256",
                    "Read-Host",
                    "CONFIRM-CLEAR",
                    "$ClearExitCode = $LASTEXITCODE",
                    "finally",
                    "net user $LabUser /delete",
                    "$DeleteExitCode = $LASTEXITCODE",
                    "STOP:",
                    "восстановите VM из исходного снимка",
                ):
                    self.assertIn(marker, text)
                self.assertLess(text.index("$ExportExitCode"), text.index("wevtutil cl Security"))
                self.assertLess(text.index("CONFIRM-CLEAR"), text.index("wevtutil cl Security"))
                self.assertLess(text.index("wevtutil cl Security"), text.index("$ClearExitCode"))
                self.assertLess(text.index("$LabUserCreated = $true"), text.index("finally"))
                self.assertLess(text.index("finally"), text.index("net user $LabUser /delete"))

    def test_windows_admin_group_is_resolved_by_well_known_sid(self) -> None:
        docs = ROOT / "komrad" / "docs"
        for relative_path in ("02-virtualbox-komrad-stand.md", "03-practice-variants.md"):
            with self.subTest(relative_path=relative_path):
                text = (docs / relative_path).read_text(encoding="utf-8")
                for marker in (
                    "$AdministratorsSid = [System.Security.Principal.SecurityIdentifier]",
                    "'S-1-5-32-544'",
                    "Get-LocalGroup -SID $AdministratorsSid -ErrorAction Stop",
                    "Add-LocalGroupMember -Group $AdministratorsGroup -Member $LabUser -ErrorAction Stop",
                ):
                    self.assertIn(marker, text)
                self.assertNotIn("net localgroup Administrators", text)
                self.assertLess(text.index("Get-LocalGroup -SID"), text.index("Add-LocalGroupMember"))
                self.assertLess(text.index("Add-LocalGroupMember"), text.index("finally"))

    def test_linux_disposable_account_has_collision_and_trap_cleanup(self) -> None:
        docs = ROOT / "komrad" / "docs"
        for relative_path in ("02-virtualbox-komrad-stand.md", "03-practice-variants.md"):
            with self.subTest(relative_path=relative_path):
                text = (docs / relative_path).read_text(encoding="utf-8")
                linux_block = text[text.index('LAB_USER="komrad_'):]
                for marker in (
                    "set -euo pipefail",
                    "LAB_USER_CREATED=0",
                    "cleanup_lab_user()",
                    "trap cleanup_lab_user EXIT INT TERM HUP",
                    'getent passwd "$LAB_USER"',
                    'sudo userdel --remove "$LAB_USER"',
                    "STOP:",
                ):
                    self.assertIn(marker, linux_block)
                self.assertNotIn('usermod -aG adm "$LAB_USER"', linux_block)
                self.assertLess(linux_block.index('getent passwd "$LAB_USER"'), linux_block.index("sudo useradd"))
                self.assertLess(linux_block.index("trap cleanup_lab_user"), linux_block.index("sudo useradd"))

    def test_privileged_installers_are_verified_before_execution(self) -> None:
        docs = ROOT / "komrad" / "docs"
        for relative_path in ("02-virtualbox-komrad-stand.md", "03-practice-variants.md"):
            with self.subTest(relative_path=relative_path):
                text = (docs / relative_path).read_text(encoding="utf-8")
                for marker in (
                    "https://npo-echelon.ru/komrad-siem/",
                    "EXPECTED_INSTALLER_SHA256",
                    "sha256sum",
                    "Get-FileHash",
                    "Get-AuthenticodeSignature",
                    "STOP:",
                ):
                    self.assertIn(marker, text)
                self.assertLess(text.index("sha256sum"), text.index("sudo --"))
                self.assertLess(text.index("Get-AuthenticodeSignature"), text.index("Start-Process"))

    def test_public_installer_faq_keeps_the_same_supply_chain_gate(self) -> None:
        text = (ROOT / "komrad" / "index.html").read_text(encoding="utf-8")
        section = text[text.index("Имя установщика отличается от примера?") :]
        for marker in (
            "официального источника",
            "аутентифицированному независимому каналу",
            "EXPECTED_INSTALLER_SHA256",
            "sha256sum",
            "STOP:",
            "chmod +x",
            "sudo --",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        self.assertLess(section.index("sha256sum"), section.index("chmod +x"))
        self.assertLess(section.index("STOP:"), section.index("sudo --"))


class ScannerSafetyTests(unittest.TestCase):
    def test_scanoval_requires_independently_authenticated_integrity_before_run(self) -> None:
        material = (ROOT / "scaner-vs" / "materials" / "scanner" / "02-scanoval-local.md").read_text(
            encoding="utf-8"
        )
        for marker in (
            "$ExpectedScanOvalSha256",
            "$ExpectedPublisher",
            "Get-FileHash",
            "Get-AuthenticodeSignature",
            "аутентифицированному независимому каналу",
            "STOP:",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, material)
        self.assertNotIn("проверьте хеш, если он опубликован", material)
        self.assertLess(material.index("Get-FileHash"), material.index("Запустите ScanOVAL"))
        self.assertLess(material.index("Get-AuthenticodeSignature"), material.index("Запустите ScanOVAL"))

        for path in (
            ROOT / "scaner-vs" / "scanner" / "index.html",
            ROOT / "_PROJECT" / "scaner-vs-offline" / "scanner" / "index.html",
        ):
            text = path.read_text(encoding="utf-8")
            section = text[text.index("ScanOVAL") :]
            with self.subTest(path=path):
                for marker in ("SHA-256", "Authenticode", "STOP", "02-scanoval-local.md"):
                    self.assertIn(marker, section)

    def test_public_pages_do_not_bypass_the_stateful_wsl_runbook(self) -> None:
        paths = (
            ROOT / "scaner-vs" / "scanner" / "index.html",
            ROOT / "_PROJECT" / "scaner-vs-offline" / "scanner" / "index.html",
        )
        for path in paths:
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=path):
                self.assertNotIn("netsh interface portproxy add v4tov4", text)
                self.assertNotIn("New-NetFirewallRule -DisplayName", text)
                self.assertIn("03-wsl-individual.md", text)
                for marker in (
                    "коллизи",
                    "уникальн",
                    "состояни",
                    "лабораторн",
                    "очист",
                    "stop",
                ):
                    self.assertIn(marker, text.lower())

    def test_public_winrm_script_is_verified_before_execution_policy_bypass(self) -> None:
        text = (ROOT / "scaner-vs" / "scanner" / "index.html").read_text(encoding="utf-8")
        section = text[text.index("Подготовить WinRM") : text.index("Linux · контролируемый доступ")]
        for marker in (
            "$ExpectedWinrmSha256",
            "Get-FileHash",
            "Get-AuthenticodeSignature",
            "аутентифицированному независимому каналу",
            "STOP:",
            "ExecutionPolicy Bypass",
            "remove.ps1",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        self.assertLess(section.index("Get-FileHash"), section.index("ExecutionPolicy Bypass"))
        self.assertLess(section.index("Get-AuthenticodeSignature"), section.index("ExecutionPolicy Bypass"))

    def test_scanner_install_media_requires_authenticated_sha256_before_privileged_use(self) -> None:
        wsl = (ROOT / "scaner-vs" / "materials" / "scanner" / "03-wsl-individual.md").read_text(
            encoding="utf-8"
        )
        live_usb = (ROOT / "scaner-vs" / "materials" / "scanner" / "05-live-usb.md").read_text(
            encoding="utf-8"
        )

        for text in (wsl, live_usb):
            for marker in (
                "аутентифицированному независимому каналу",
                "SHA-256",
                "STOP:",
            ):
                with self.subTest(document=text.splitlines()[0], marker=marker):
                    self.assertIn(marker, text)
        self.assertNotIn("контрольную сумму, если производитель ее опубликовал", wsl)
        self.assertNotIn("контрольная сумма, если она опубликована", live_usb)

        self.assertIn("EXPECTED_INSTALLER_SHA256", wsl)
        self.assertIn("sha256sum", wsl)
        self.assertLess(wsl.index("sha256sum"), wsl.index('bash -- "$INSTALLER"'))

        self.assertIn("$ExpectedImageSha256", live_usb)
        self.assertIn("Get-FileHash", live_usb)
        self.assertLess(live_usb.index("Get-FileHash"), live_usb.index("используйте Rufus в режиме DD"))

    def test_archive_builder_rejects_reparse_asset(self) -> None:
        with tempfile.TemporaryDirectory(prefix="scanner-reparse-") as temp_name:
            temp = Path(temp_name)
            shutil.copytree(
                ROOT / "scaner-vs",
                temp / "scaner-vs",
                ignore=shutil.ignore_patterns("release", "downloads"),
            )
            (temp / "_PROJECT").mkdir()
            shutil.copy2(ROOT / "_PROJECT" / "build-scaner-vs-archives.ps1", temp / "_PROJECT")
            shutil.copytree(ROOT / "_PROJECT" / "scaner-vs-offline", temp / "_PROJECT" / "scaner-vs-offline")
            asset = temp / "scaner-vs" / "assets" / "site.css"
            asset.unlink()
            secret = temp / "outside-secret.css"
            secret.write_text("SECRET_MUST_NOT_SHIP\n", encoding="utf-8")
            os.symlink(secret, asset)

            result = subprocess.run(
                [
                    "pwsh",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(temp / "_PROJECT" / "build-scaner-vs-archives.ps1"),
                    "-Root",
                    str(temp),
                ],
                cwd=temp,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Scanner archive source file must not be a reparse point", result.stdout + result.stderr)

    def test_archive_builder_rejects_unreviewed_markdown(self) -> None:
        # Keep the deliberate unexpected file outside the shared checkout so
        # concurrent release builds/reviewers can never observe the fixture.
        with tempfile.TemporaryDirectory(prefix="scanner-unreviewed-") as temp_name:
            temp = Path(temp_name)
            shutil.copytree(
                ROOT / "scaner-vs",
                temp / "scaner-vs",
                ignore=shutil.ignore_patterns("release", "downloads"),
            )
            (temp / "_PROJECT").mkdir()
            shutil.copy2(ROOT / "_PROJECT" / "build-scaner-vs-archives.ps1", temp / "_PROJECT")
            shutil.copytree(ROOT / "_PROJECT" / "scaner-vs-offline", temp / "_PROJECT" / "scaner-vs-offline")
            stray = temp / "scaner-vs" / "materials" / "scanner" / ".release-regression.md"
            self.assertFalse(stray.exists(), f"test collision: {stray}")
            stray.write_text("# This file must never be published implicitly.\n", encoding="utf-8")
            try:
                result = subprocess.run(
                    [
                        "powershell",
                        "-NoProfile",
                        "-ExecutionPolicy",
                        "Bypass",
                        "-File",
                        str(temp / "_PROJECT" / "build-scaner-vs-archives.ps1"),
                        "-Root",
                        str(temp),
                    ],
                    cwd=temp,
                    encoding="utf-8",
                    errors="replace",
                    capture_output=True,
                    timeout=60,
                    check=False,
                )
            finally:
                stray.unlink(missing_ok=True)

        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Unexpected scanner archive source file", result.stdout + result.stderr)

    def test_wsl_network_cleanup_uses_per_run_names(self) -> None:
        text = (ROOT / "scaner-vs" / "materials" / "scanner" / "03-wsl-individual.md").read_text(encoding="utf-8")
        for marker in (
            "$LabId",
            "$RuleName",
            "-Name $RuleName",
            "отказаться от создания",
            "function Remove-ScannerVsLabRule",
            "$PortProxyCreated",
            "$FirewallCreated",
            "catch",
            "$LASTEXITCODE",
            "$proxyDeleteExitCode -ne 0",
            "-ErrorAction SilentlyContinue",
            "Cleanup неполон",
            "$OwnershipToken",
            "$OwnershipDescription",
            "-Description $OwnershipDescription",
            "-LocalAddress $HostAddress",
            "[System.Net.IPAddress]::TryParse",
            "Get-NetFirewallAddressFilter",
            "маркер владения",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)
        self.assertNotIn('-DisplayName "Allow Scanner UI"', text)
        self.assertNotIn("utf8NoBOM", text, "Windows PowerShell 5.1 does not support this encoding name")
        powershell_blocks = "\n".join(re.findall(r"```powershell\n(.*?)\n```", text, flags=re.DOTALL))
        self.assertNotIn("portproxy reset", powershell_blocks)

        creation_block = re.search(
            r"```powershell\n(?P<body>\$LabId.*?\n)```",
            text,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(creation_block)
        rollback = creation_block.group("body")
        for marker in (
            "$rollbackRuleStillExists",
            "$rollbackProxyStillExists",
            "if ($rollbackRuleStillExists -or $rollbackProxyStillExists)",
            "сохранён для ручного восстановления",
        ):
            with self.subTest(rollback_marker=marker):
                self.assertIn(marker, rollback)
        self.assertLess(
            rollback.index("$rollbackProxyStillExists"),
            rollback.rindex("Remove-Item -LiteralPath $StatePath"),
        )

        cleanup = re.search(
            r"function Remove-ScannerVsLabRule \{(?P<body>.*?)\n\}",
            text,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(cleanup)
        cleanup_body = cleanup.group("body")
        self.assertIn("[regex]::Escape([string]$State.WslAddress)", cleanup_body)
        self.assertIn("$createdProxy -and -not $createdRule", cleanup_body)
        self.assertLess(cleanup_body.index("маркер владения"), cleanup_body.index("portproxy delete"))
        self.assertLess(cleanup_body.index("Get-NetFirewallAddressFilter"), cleanup_body.index("portproxy delete"))
        self.assertLess(cleanup_body.index("portproxy delete"), cleanup_body.index("Remove-NetFirewallRule"))

    def test_wsl_network_setup_rejects_existing_https_listener_before_mutation(self) -> None:
        text = (ROOT / "scaner-vs" / "materials" / "scanner" / "03-wsl-individual.md").read_text(
            encoding="utf-8"
        )
        creation_block = re.search(
            r"```powershell\n(?P<body>\$LabId.*?\n)```",
            text,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(creation_block)
        body = creation_block.group("body")
        for marker in (
            "Get-NetTCPConnection -State Listen -ErrorAction Stop",
            "@($HostAddress, '0.0.0.0', '::',",
            "занят существующим TCP listener",
            "$labPrefixLength -lt 24",
            "лабораторной IPv4-подсетью /24-/32",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, body)
        self.assertLess(body.index("Get-NetTCPConnection"), body.index("portproxy add"))
        self.assertLess(body.index("$labPrefixLength -lt 24"), body.index("New-NetFirewallRule"))

    def test_wsl_network_setup_persists_atomic_pending_state_before_mutation(self) -> None:
        text = (ROOT / "scaner-vs" / "materials" / "scanner" / "03-wsl-individual.md").read_text(
            encoding="utf-8"
        )
        creation_block = re.search(
            r"```powershell\n(?P<body>\$LabId.*?\n)```",
            text,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(creation_block)
        body = creation_block.group("body")
        for marker in (
            "function Write-ScannerVsLabState",
            "[System.IO.File]::Move",
            "[System.IO.File]::Replace",
            "if (Test-Path -LiteralPath $StatePath)",
            "Коллизия state file",
            "Write-ScannerVsLabState -State $State -Create",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, body)

        initial_state = body.index("Write-ScannerVsLabState -State $State -Create")
        proxy_add = body.index("portproxy add")
        proxy_flag = body.index("$State.PortProxyCreated = $true")
        firewall_add = body.index("New-NetFirewallRule")
        firewall_flag = body.index("$State.FirewallCreated = $true")
        state_updates = [
            match.start()
            for match in re.finditer(r"Write-ScannerVsLabState -State \$State(?! -Create)", body)
        ]
        self.assertGreaterEqual(len(state_updates), 2)
        self.assertLess(initial_state, proxy_add)
        self.assertLess(proxy_add, proxy_flag)
        self.assertLess(proxy_flag, state_updates[0])
        self.assertLess(state_updates[0], firewall_add)
        self.assertLess(firewall_add, firewall_flag)
        self.assertLess(firewall_flag, state_updates[1])

    def test_live_usb_write_is_instructor_only_and_disk_identity_guarded(self) -> None:
        text = (ROOT / "scaner-vs" / "materials" / "scanner" / "05-live-usb.md").read_text(encoding="utf-8")
        for marker in ("только преподаватель", "Get-Disk", "SerialNumber", "IsBoot", "IsSystem"):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)
        self.assertNotIn("через `dd`", text)


class PpkLeastPrivilegeTests(unittest.TestCase):
    def test_example_does_not_grant_dac_bypass(self) -> None:
        text = (ROOT / "ppk" / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("cap_dac_read_search", text.lower())
        for marker in ("CAP_NET_BIND_SERVICE", "выделенной учётной записи", "не выполняйте дословно"):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)

    def test_cyclonedx_release_and_vendor_metric_are_time_scoped(self) -> None:
        text = (ROOT / "ppk" / "index.html").read_text(encoding="utf-8")
        self.assertIn('datetime="2025-10-21"', text)
        self.assertIn("21 октября 2025", text)
        self.assertNotIn("марте 2026", text)
        self.assertNotIn("релиз марта 2026", text)
        self.assertNotIn("<h3>85% уязвимостей — в транзитивных зависимостях</h3>", text)
        for marker in ("показатель CodeScoring", "не является универсальной оценкой", "методики подсчёта"):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)


class PentestProgramBoundaryTests(unittest.TestCase):
    def test_public_dvwa_quick_start_uses_only_canonical_bounded_wrappers(self) -> None:
        html = (ROOT / "pentest" / "practice.html").read_text(encoding="utf-8")
        for marker in (
            "dvwa-preflight.ps1",
            "dvwa-start.ps1",
            "dvwa-stop.ps1",
            "lab/dvwa-compose.yml",
            "трёхсервис",
            "digest",
            "CLEANUP OK",
            "STOP:",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, html)
        for forbidden in (
            "vulnerables/web-dvwa",
            ":latest",
            "docker pull ",
            "docker run ",
            "--restart unless-stopped",
            "одноразовом Docker-контейнере",
            "кража <code>document.cookie</code>",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, html)
        self.assertLess(html.index("dvwa-preflight.ps1"), html.index("dvwa-start.ps1"))
        self.assertLess(html.index("dvwa-start.ps1"), html.index("dvwa-stop.ps1"))
        self.assertIn("Reflected XSS: синтетический alert-маркер без доступа к cookies/storage", html)

    def test_masscan_example_requires_signed_roe_and_exact_allowlist(self) -> None:
        html = (ROOT / "pentest" / "index.html").read_text(encoding="utf-8")
        section = html[html.index('data-screen-label="42 Этапы 3-4') : html.index('data-screen-label="43 Этапы 5-6')]
        for marker in (
            "SIGNED_ROE",
            "AUTHORIZED_CIDR",
            "AUTHORIZED_PORTS",
            "roe-allowlist.txt",
            "grep -Fx",
            "STOP:",
            "--rate 100",
            'masscan</span> --rate 100 -p"$AUTHORIZED_PORTS" "$AUTHORIZED_CIDR"',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        for forbidden in ("0.0.0.0/0", "--rate 5000", "-p1-65535"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, html)
        self.assertLess(section.index("grep -Fx"), section.index('<span class="kw">masscan</span>'))

    def test_nmap_example_uses_the_same_validated_bounded_allowlist(self) -> None:
        html = (ROOT / "pentest" / "index.html").read_text(encoding="utf-8")
        section = html[html.index('data-screen-label="42 Этапы 3-4') : html.index('data-screen-label="43 Этапы 5-6')]
        for marker in (
            "SIGNED_ROE",
            "AUTHORIZED_CIDR",
            "AUTHORIZED_PORTS",
            "grep -Fx",
            "STOP:",
            "--version-light",
            "--max-rate 100",
            'nmap</span> -sS -sV --version-light -T3 --max-rate 100 -p"$AUTHORIZED_PORTS" "$AUTHORIZED_CIDR"',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        for forbidden in ("10.0.0.0/16", "203.0.113.0/24", "-p-", "-T4", "-sC"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, section)
        self.assertLess(section.index("grep -Fx"), section.index("nmap</span>"))

    def test_metasploitable_import_requires_trusted_source_and_sha256(self) -> None:
        html = (ROOT / "pentest" / "index.html").read_text(encoding="utf-8")
        section = html[html.index('data-screen-label="76 Metasploitable 2"') : html.index('data-screen-label="77 Сценарий практики"')]
        for marker in (
            "https://docs.rapid7.com/metasploit/metasploitable-2/",
            "https://sourceforge.net/projects/metasploitable/",
            "$MetasploitableZip",
            "$ExpectedMetasploitableSha256",
            "Get-FileHash",
            "STOP:",
            "Expand-Archive",
            "Host-only",
            "аутентифицированному независимому каналу",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        self.assertLess(section.index("Get-FileHash"), section.index("Expand-Archive"))
        self.assertLess(section.index("STOP:"), section.index("Expand-Archive"))
        self.assertNotIn("unzip</span> metasploitable", section)

    def test_teaching_ci_images_are_pinned_to_reviewed_digest(self) -> None:
        expected = "python:3.12@sha256:3b524c305ebbec824b8b8f65b72d0f82527eae50c32998160f0a9fca5337f594"
        for folder in ("27-07-2026", "29-07-2026"):
            path = ROOT / folder / "code" / ".gitlab-ci.yml"
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=path):
                self.assertIn(f"image: {expected}", text)
                self.assertNotRegex(text, r"(?m)^\s*image:\s*python:3\.12\s*$")

    def test_hands_on_claims_are_conditioned_on_roe_and_runbook(self) -> None:
        text = (ROOT / "new-courses" / "pentest-02.html").read_text(encoding="utf-8")
        for marker in (
            "справочная программа (reference-only)",
            "Rules of Engagement (RoE)",
            "runbook",
            "STOP-критерии",
            "письменного разрешения",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)

        for marker in (
            "справочная программа (reference-only)",
            "RoE-check перед каждым модулем",
            "не наследуется как общее разрешение",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)


class AppsecOwaspMappingTests(unittest.TestCase):
    def test_practicum_does_not_claim_unimplemented_a10_2025_lab(self) -> None:
        paths = (
            APPSEC / "index.html",
            APPSEC / "practice.html",
            APPSEC / "day-02.html",
            APPSEC / "materials" / "практикум-день-2-набор-заданий.md",
            APPSEC / "downloads" / "day-02" / "transcripts" / "Протокол-дня-02-редактированный.md",
        )
        forbidden = (
            "весь OWASP Top 10",
            "всему OWASP Top 10",
            "A01→A10",
            "ЛР_1–ЛР_10 идут по порядку OWASP Top 10:2025",
        )
        for path in paths:
            text = path.read_text(encoding="utf-8")
            for marker in forbidden:
                with self.subTest(path=path.name, marker=marker):
                    self.assertNotIn(marker, text)

        for path in (APPSEC / "practice.html", APPSEC / "day-02.html", paths[3]):
            text = path.read_text(encoding="utf-8")
            for marker in ("A01–A09:2025", "A10:2021"):
                with self.subTest(path=path.name, marker=marker):
                    self.assertIn(marker, text)


class UniversalLecturePresentationTests(unittest.TestCase):
    def _run_minimal_release(
        self,
        relative_path: str,
        *,
        symlink_target: Path | None = None,
        initialize_git: bool = False,
    ) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory(prefix="release-boundary-") as temp_name:
            temp = Path(temp_name)
            root = temp / "site"
            project = root / "_PROJECT"
            lecture = root / "lecture"
            project.mkdir(parents=True)
            lecture.mkdir()
            shutil.copy2(ROOT / "_PROJECT" / "build-release.ps1", project / "build-release.ps1")
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            registry = {
                "updated": "2026-08-15",
                "lectures": [
                    {
                        "folder": "lecture",
                        "domain": "lecture",
                        "url": "https://lecture.example.test/",
                        "title": "Boundary fixture",
                    }
                ],
            }
            (project / "lectures.json").write_text(
                json.dumps(registry, ensure_ascii=False), encoding="utf-8"
            )
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            (lecture / "index.html").write_text("<!doctype html><title>lecture</title>\n", encoding="utf-8")
            if initialize_git:
                subprocess.run(["git", "init", "--quiet", str(root)], check=True, capture_output=True)
                subprocess.run(["git", "-C", str(root), "add", "."], check=True, capture_output=True)
            candidate = lecture / Path(relative_path)
            candidate.parent.mkdir(parents=True, exist_ok=True)
            if symlink_target is None:
                candidate.write_text("runtime secret\n", encoding="utf-8")
            else:
                try:
                    os.symlink(symlink_target, candidate)
                except OSError as error:
                    self.skipTest(f"file symlinks are unavailable: {error}")

            return subprocess.run(
                [
                    "pwsh",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(project / "build-release.ps1"),
                    "-Root",
                    str(root),
                    "-ReleaseDate",
                    "2026-08-15",
                    "-FailOnIssues",
                ],
                cwd=root,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )

    def test_release_builder_rejects_reparse_source(self) -> None:
        with tempfile.TemporaryDirectory(prefix="release-external-") as external_name:
            secret = Path(external_name) / "outside-secret.txt"
            secret.write_text("must not ship\n", encoding="utf-8")
            result = self._run_minimal_release("assets/outside-secret.txt", symlink_target=secret)
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("reparse point", (result.stdout + result.stderr).lower())

    def test_release_builder_rejects_high_risk_runtime_artifact(self) -> None:
        result = self._run_minimal_release("code/components.db")
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("high-risk release source file", (result.stdout + result.stderr).lower())

    def test_release_builder_rejects_untracked_broad_selector_artifact(self) -> None:
        result = self._run_minimal_release("private-note.txt", initialize_git=True)
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("untracked repository artifact", (result.stdout + result.stderr).lower())

    def test_release_builder_rejects_untracked_source_even_at_a_formerly_reviewed_path(self) -> None:
        with tempfile.TemporaryDirectory(prefix="release-untracked-hash-") as temp_name:
            root = Path(temp_name) / "site"
            project = root / "_PROJECT"
            lecture = root / "lecture"
            project.mkdir(parents=True)
            lecture.mkdir()
            shutil.copy2(ROOT / "_PROJECT" / "build-release.ps1", project / "build-release.ps1")
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            (project / "lectures.json").write_text(
                json.dumps(
                    {
                        "updated": "2026-08-15",
                        "lectures": [
                            {
                                "folder": "lecture",
                                "domain": "lecture",
                                "url": "https://lecture.example.test/",
                                "title": "Hash fixture",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            (lecture / "index.html").write_text("<!doctype html><title>lecture</title>\n", encoding="utf-8")
            subprocess.run(["git", "init", "--quiet", str(root)], check=True, capture_output=True)
            subprocess.run(["git", "-C", str(root), "add", "."], check=True, capture_output=True)
            (root / "course-map.html").write_text("UNREVIEWED REPLACEMENT\n", encoding="utf-8")
            result = subprocess.run(
                ["pwsh", "-NoProfile", "-File", str(project / "build-release.ps1"), "-Root", str(root)],
                cwd=root,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("untracked repository artifact", (result.stdout + result.stderr).lower())

    def test_release_policy_has_no_persistent_untracked_allowlist(self) -> None:
        script = (ROOT / "_PROJECT" / "build-release.ps1").read_text(encoding="utf-8")
        self.assertNotIn("ApprovedUntrackedReleaseArtifacts", script)

    def test_release_builder_refreshes_git_gate_after_course_builders(self) -> None:
        with tempfile.TemporaryDirectory(prefix="release-builder-toctou-") as temp_name:
            root = Path(temp_name) / "site"
            project = root / "_PROJECT"
            lecture = root / "lecture"
            build_dir = lecture / "_build"
            project.mkdir(parents=True)
            build_dir.mkdir(parents=True)
            shutil.copy2(ROOT / "_PROJECT" / "build-release.ps1", project / "build-release.ps1")
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            (build_dir / "build-materials-zip.ps1").write_text(
                "[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot '..\\undeclared.html'), 'BUILDER LEAK')\n",
                encoding="utf-8",
            )
            (project / "lectures.json").write_text(
                json.dumps(
                    {
                        "updated": "2026-08-15",
                        "lectures": [
                            {
                                "folder": "lecture",
                                "domain": "lecture",
                                "url": "https://lecture.example.test/",
                                "title": "Builder TOCTOU fixture",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            (lecture / "index.html").write_text("<!doctype html><title>lecture</title>\n", encoding="utf-8")
            subprocess.run(["git", "init", "--quiet", str(root)], check=True, capture_output=True)
            subprocess.run(["git", "-C", str(root), "add", "."], check=True, capture_output=True)
            result = subprocess.run(
                ["pwsh", "-NoProfile", "-File", str(project / "build-release.ps1"), "-Root", str(root)],
                cwd=root,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("untracked repository artifact", (result.stdout + result.stderr).lower())

    def test_post_build_gate_rejects_quarantine_and_runtime_artifacts(self) -> None:
        with tempfile.TemporaryDirectory(prefix="release-post-build-gate-") as temp_name:
            temp = Path(temp_name)
            archive_path = temp / "malicious-release.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("index.html", "<!doctype html><title>fixture</title>\n")
                archive.writestr("downloads/day-01/lab-results/private.md", "private\n")
                archive.writestr("code/components.db", b"SQLite format 3\x00")
                archive.writestr("index.html.orig", "backup\n")
            release_index = temp / "release-index.json"
            release_index.write_text(
                json.dumps(
                    [
                        {
                            "domain": "fixture.pikov.expert",
                            "archivePath": str(archive_path),
                        }
                    ]
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    "pwsh",
                    "-NoProfile",
                    "-File",
                    str(ROOT / "_PROJECT" / "test-public-release-independence.ps1"),
                    "-Root",
                    str(ROOT),
                    "-ReleaseIndex",
                    str(release_index),
                ],
                cwd=ROOT,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        output = (result.stdout + result.stderr).lower()
        self.assertNotEqual(0, result.returncode, output)
        for marker in ("downloads/day-01/lab-results", "components.db", "index.html.orig"):
            with self.subTest(marker=marker):
                self.assertIn(marker, output)

    def test_post_build_gate_preserves_outer_policy_context_for_nested_archives(self) -> None:
        with tempfile.TemporaryDirectory(prefix="release-nested-policy-") as temp_name:
            temp = Path(temp_name)
            deep_buffer = io.BytesIO()
            with zipfile.ZipFile(deep_buffer, "w", compression=zipfile.ZIP_DEFLATED) as deep:
                deep.writestr("participant-materials/deep-secret.md", "deep secret\n")
            nested_buffer = io.BytesIO()
            with zipfile.ZipFile(nested_buffer, "w", compression=zipfile.ZIP_DEFLATED) as nested:
                nested.writestr("lab-results/student-report.md", "report\n")
                nested.writestr("program-and-environment/prepare.sh", "#!/bin/sh\n")
                nested.writestr("nested.zip", deep_buffer.getvalue())
            transcript_buffer = io.BytesIO()
            with zipfile.ZipFile(
                transcript_buffer, "w", compression=zipfile.ZIP_DEFLATED
            ) as transcript:
                transcript.writestr("participant-materials/transcript-secret.md", "secret\n")
            archive_path = temp / "malicious-release.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("index.html", "<!doctype html><title>fixture</title>\n")
                archive.writestr(
                    "downloads/day-01-canonical-safe-package.zip",
                    nested_buffer.getvalue(),
                )
                archive.writestr(
                    "downloads/day-01-edited-transcript-and-summaries.zip",
                    transcript_buffer.getvalue(),
                )
            release_index = temp / "release-index.json"
            release_index.write_text(
                json.dumps(
                    [
                        {
                            "domain": "fixture.pikov.expert",
                            "archivePath": str(archive_path),
                        }
                    ]
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    "pwsh",
                    "-NoProfile",
                    "-File",
                    str(ROOT / "_PROJECT" / "test-public-release-independence.ps1"),
                    "-Root",
                    str(ROOT),
                    "-ReleaseIndex",
                    str(release_index),
                ],
                cwd=ROOT,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
        output = (result.stdout + result.stderr).lower()
        self.assertNotEqual(0, result.returncode, output)
        for marker in (
            "participant-materials/deep-secret.md",
            "participant-materials/transcript-secret.md",
            "lab-results/student-report.md",
            "program-and-environment/prepare.sh",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, output)

    def test_registry_folder_cannot_escape_repository_for_build_or_control_generation(self) -> None:
        with tempfile.TemporaryDirectory(prefix="registry-folder-boundary-") as temp_name:
            temp = Path(temp_name)
            root = temp / "site"
            project = root / "_PROJECT"
            outside = temp / "outside"
            project.mkdir(parents=True)
            outside.mkdir()
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            (outside / "index.html").write_text("<!doctype html><title>outside</title>\n", encoding="utf-8")
            for name in ("build-release.ps1", "update-site-control-files.ps1"):
                shutil.copy2(ROOT / "_PROJECT" / name, project / name)
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            registry = {
                "updated": "2026-08-15",
                "summary": {"cards": 1, "thirdLevelDomains": 1, "readyLocal": 1, "publishedSnapshot": 0},
                "lectures": [
                    {
                        "position": 1,
                        "folder": "..\\outside",
                        "domain": "outside",
                        "url": "https://outside.example.test/",
                        "title": "Traversal fixture",
                        "status": "ready-local",
                    }
                ],
            }
            (project / "lectures.json").write_text(
                json.dumps(registry, ensure_ascii=False), encoding="utf-8"
            )

            for script_name in ("build-release.ps1", "update-site-control-files.ps1"):
                with self.subTest(script=script_name):
                    result = subprocess.run(
                        [
                            "pwsh",
                            "-NoProfile",
                            "-File",
                            str(project / script_name),
                            "-Root",
                            str(root),
                        ],
                        cwd=root,
                        encoding="utf-8",
                        errors="replace",
                        capture_output=True,
                        timeout=60,
                        check=False,
                    )
                    self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
                    self.assertIn("unsafe lecture folder", (result.stdout + result.stderr).lower())
            self.assertFalse((outside / ".htaccess").exists())
            self.assertFalse((outside / "robots.txt").exists())
            self.assertFalse((outside / "sitemap.xml").exists())

    def test_registry_domain_cannot_escape_release_directory(self) -> None:
        with tempfile.TemporaryDirectory(prefix="registry-domain-boundary-") as temp_name:
            temp = Path(temp_name)
            root = temp / "site"
            project = root / "_PROJECT"
            lecture = root / "lecture"
            project.mkdir(parents=True)
            lecture.mkdir()
            shutil.copy2(ROOT / "_PROJECT" / "build-release.ps1", project / "build-release.ps1")
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            (lecture / "index.html").write_text("<!doctype html><title>lecture</title>\n", encoding="utf-8")
            registry = {
                "updated": "2026-08-15",
                "lectures": [
                    {
                        "folder": "lecture",
                        "domain": "..\\..\\outside",
                        "url": "https://outside.example.test/",
                        "title": "Domain traversal fixture",
                    }
                ],
            }
            (project / "lectures.json").write_text(json.dumps(registry), encoding="utf-8")
            result = subprocess.run(
                [
                    "pwsh",
                    "-NoProfile",
                    "-File",
                    str(project / "build-release.ps1"),
                    "-Root",
                    str(root),
                    "-ReleaseDate",
                    "2026-08-15",
                ],
                cwd=root,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
            self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
            self.assertIn("unsafe lecture domain", (result.stdout + result.stderr).lower())
            self.assertFalse(any(temp.glob("outside*.zip")))

    def test_registry_folder_cannot_select_internal_service_directory(self) -> None:
        with tempfile.TemporaryDirectory(prefix="registry-internal-folder-") as temp_name:
            root = Path(temp_name) / "site"
            project = root / "_PROJECT"
            project.mkdir(parents=True)
            for name in ("build-release.ps1", "update-site-control-files.ps1"):
                shutil.copy2(ROOT / "_PROJECT" / name, project / name)
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            (project / "lectures.json").write_text(
                json.dumps(
                    {
                        "updated": "2026-08-15",
                        "lectures": [
                            {
                                "position": 1,
                                "folder": "_PROJECT",
                                "domain": "internal",
                                "url": "https://internal.example.test/",
                                "title": "Internal folder fixture",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            for script_name in ("build-release.ps1", "update-site-control-files.ps1"):
                with self.subTest(script=script_name):
                    result = subprocess.run(
                        ["pwsh", "-NoProfile", "-File", str(project / script_name), "-Root", str(root)],
                        cwd=root,
                        encoding="utf-8",
                        errors="replace",
                        capture_output=True,
                        timeout=60,
                        check=False,
                    )
                    self.assertNotEqual(0, result.returncode, result.stdout + result.stderr)
                    self.assertIn("unsafe lecture folder", (result.stdout + result.stderr).lower())

    def test_sql_course_bundle_is_rebuilt_from_a_clean_checkout_shape(self) -> None:
        source = ROOT / "29-07-2026"
        wrapper_source = (source / "_build" / "build-materials-zip.ps1").read_text(encoding="utf-8")
        self.assertNotIn("exit $LASTEXITCODE", wrapper_source)
        with tempfile.TemporaryDirectory(prefix="sql-clean-bundle-") as temp_name:
            course = Path(temp_name) / "29-07-2026"
            shutil.copytree(
                source,
                course,
                ignore=shutil.ignore_patterns(
                    "materials.zip",
                    "release",
                    "__pycache__",
                    ".pytest_cache",
                    ".ruff_cache",
                    "components.db",
                ),
            )
            result = subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(course / "_build" / "build-materials-zip.ps1"),
                    "-Python",
                    sys.executable,
                ],
                cwd=course,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=60,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            bundle = course / "materials.zip"
            self.assertTrue(bundle.is_file(), "clean-checkout builder did not create materials.zip")
            with zipfile.ZipFile(bundle) as archive:
                entries = set(archive.namelist())
            self.assertIn("code/step3_student_solution.py", entries)
            self.assertFalse(any(Path(name).suffix.lower() in {".db", ".sqlite", ".sqlite3"} for name in entries))

            root = Path(temp_name)
            project = root / "_PROJECT"
            project.mkdir()
            shutil.copy2(ROOT / "_PROJECT" / "build-release.ps1", project / "build-release.ps1")
            (project / "build-astra-hardening-labs.ps1").write_text(
                "param([switch]$Check)\nWrite-Output 'ASTRA FIXTURE OK'\nreturn\n", encoding="utf-8"
            )
            (project / "lectures.json").write_text(
                json.dumps(
                    {
                        "updated": "2026-08-15",
                        "lectures": [
                            {
                                "folder": "29-07-2026",
                                "domain": "29-07-2026",
                                "url": "https://29-07-2026.example.test/",
                                "title": "SQL fixture",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            (root / "index.html").write_text("<!doctype html><title>root</title>\n", encoding="utf-8")
            full_result = subprocess.run(
                [
                    "pwsh",
                    "-NoProfile",
                    "-File",
                    str(project / "build-release.ps1"),
                    "-Root",
                    str(root),
                    "-ReleaseDate",
                    "2026-08-15",
                ],
                cwd=root,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=120,
                check=False,
            )
            self.assertEqual(0, full_result.returncode, full_result.stdout + full_result.stderr)
            self.assertIn("RELEASE BUILD OK", full_result.stdout)
            self.assertTrue((project / "RELEASE_INDEX_2026-08-15.json").is_file())
            release_archives = tuple((course / "release").glob("*.zip"))
            self.assertEqual(1, len(release_archives))
            with zipfile.ZipFile(release_archives[0]) as release_archive:
                self.assertIn("materials.zip", release_archive.namelist())

    def test_release_policy_has_no_retired_pdf_exception(self) -> None:
        policy = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertNotIn("PublishPdfFolders", policy)
        self.assertNotIn("Currently approved: 27-07-2026", policy)

    def test_appsec_canonical_packages_are_built_before_security_regressions_in_ci(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "site-checks.yml").read_text(encoding="utf-8")
        builder = "appsec-lections\\_build\\build-materials-zip.ps1"
        regression = "appsec-lections\\_build\\security_regression_tests.py"
        self.assertIn(builder, workflow)
        self.assertLess(workflow.index(builder), workflow.index(regression))

    def test_root_inventory_date_matches_the_lecture_registry(self) -> None:
        registry = json.loads((ROOT / "_PROJECT" / "lectures.json").read_text(encoding="utf-8"))
        updated = date.fromisoformat(registry["updated"])
        months = (
            "",
            "января",
            "февраля",
            "марта",
            "апреля",
            "мая",
            "июня",
            "июля",
            "августа",
            "сентября",
            "октября",
            "ноября",
            "декабря",
        )
        expected = f"{updated.day} {months[updated.month]} {updated.year} года"
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn(expected, readme)

        lectures = registry["lectures"]
        actual_ready = sum(item["status"] == "ready-local" for item in lectures)
        actual_snapshot = sum(item["status"] == "published-snapshot" for item in lectures)
        summary = registry["summary"]
        self.assertEqual(actual_ready, summary["readyLocal"])
        self.assertEqual(actual_snapshot, summary["publishedSnapshot"])
        self.assertIn(f"| `ready-local` | {actual_ready} |", readme)
        self.assertIn(f"| `published-snapshot` | {actual_snapshot} |", readme)

        sitemap = ET.parse(ROOT / "sitemap.xml").getroot()
        sitemap_count = len(sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url"))
        self.assertIn(
            f"| Уникальных URL в `sitemap.xml` вместе с корнем | {sitemap_count} |",
            readme,
        )

    def test_sql_course_visible_titles_are_not_tied_to_calendar_date(self) -> None:
        paths = (
            ROOT / "29-07-2026" / "index.html",
            ROOT / "29-07-2026" / "materials" / "ЧИТАТЬ-ПЕРВЫМ.md",
            ROOT / "29-07-2026" / "materials" / "ЧИТАТЬ-ПЕРВЫМ-Mac.md",
            ROOT / "29-07-2026" / "materials" / "konspekt.md",
            ROOT / "29-07-2026" / "materials" / "praktikum.md",
        )
        for path in paths:
            with self.subTest(path=path.name):
                self.assertNotIn("29 июля 2026", path.read_text(encoding="utf-8"))

    def test_sql_course_test_count_and_solution_module_are_consistent(self) -> None:
        course = ROOT / "29-07-2026"
        test_source = (course / "code" / "test_student.py").read_text(encoding="utf-8")
        canonical_count = len(re.findall(r"^    def test_", test_source, flags=re.MULTILINE))
        self.assertEqual(14, canonical_count)
        self.assertIn("REGISTRY_MODULE=step3_student_solution", test_source)
        self.assertNotIn("REGISTRY_MODULE=step3_fixed", test_source)

        checked_paths = (
            course / "index.html",
            course / "materials" / "praktikum.md",
            course / "materials" / "ЧИТАТЬ-ПЕРВЫМ.md",
            course / "materials" / "ЧИТАТЬ-ПЕРВЫМ-Mac.md",
            course / "code" / "spravka.md",
            course / "code" / "step3_student_solution.py",
            *(course / "_teacher").glob("*.md"),
        )
        stale_count = re.compile(
            r"(?:13/13|Ran 13 tests|13 тестов|errors=13|открытым 13|13 (?:проверок|ошибок))"
        )
        for path in checked_paths:
            with self.subTest(path=path.name):
                self.assertIsNone(stale_count.search(path.read_text(encoding="utf-8")))

    def test_sql_course_solution_is_explicitly_release_after_attempt(self) -> None:
        course = ROOT / "29-07-2026"
        builder = (course / "_build" / "build-materials-zip.py").read_text(encoding="utf-8")
        self.assertIn('("code/step3_student_solution.py", "code/step3_student_solution.py")', builder)
        paths = (
            course / "materials" / "ЧИТАТЬ-ПЕРВЫМ.md",
            course / "materials" / "ЧИТАТЬ-ПЕРВЫМ-Mac.md",
            course / "materials" / "praktikum.md",
            course / "code" / "spravka.md",
            course / "code" / "test_student.py",
        )
        for path in paths:
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=path.name):
                self.assertIn("после собственной попытки", text)
                self.assertIn("step3_student_solution", text)

    def test_appsec_public_course_intros_are_not_tied_to_event_date(self) -> None:
        paths = tuple(
            ROOT / "appsec-lections" / name
            for name in (
                "index.html",
                "day-01.html",
                "day-02.html",
                "practice.html",
                "slides-day-01.html",
                "for-teachers.html",
                "glossary.html",
            )
        )
        event_dates = ("11–12 августа 2026", "11.08.2026", "12 августа 2026")
        for path in paths:
            text = path.read_text(encoding="utf-8")
            for event_date in event_dates:
                with self.subTest(path=path.name, event_date=event_date):
                    self.assertNotIn(event_date, text)

        provenance = (ROOT / "appsec-lections" / "rights.html").read_text(encoding="utf-8")
        self.assertIn("11–12 августа 2026", provenance)

    def test_appsec_day_two_public_manifest_is_date_neutral(self) -> None:
        manifest_path = APPSEC / "downloads" / "day-02-manifest.json"
        manifest_text = manifest_path.read_text(encoding="utf-8")
        for event_date in ("2026-08-12", "12.08.2026", "12 августа 2026"):
            with self.subTest(event_date=event_date):
                self.assertNotIn(event_date, manifest_text)

    def test_day_one_checksum_entries_are_physical_lines(self) -> None:
        checksum_path = APPSEC / "downloads" / "day-01-SHA256SUMS.md"
        lines = checksum_path.read_text(encoding="utf-8").splitlines()
        entry_pattern = re.compile(r"^[0-9A-F]{64}  \S+\.zip  \d+ bytes$")
        entries = [line for line in lines if entry_pattern.fullmatch(line)]
        self.assertEqual(2, len(entries), "each archive checksum must occupy its own physical line")
        self.assertIn("```text", lines)
        self.assertIn("```", lines)

    def test_tz_readme_does_not_require_removed_mascom_logos(self) -> None:
        readme = (ROOT / "tz" / "README.md").read_text(encoding="utf-8")
        self.assertNotRegex(readme, r"logo-mascom\.(?:png|svg)")

    def test_komrad_lecture_pages_have_no_event_date(self) -> None:
        paths = (
            ROOT / "komrad" / "index.html",
            ROOT / "komrad" / "docs" / "00_ОПИСАНИЕ_РАЗДЕЛА.md",
            ROOT / "komrad" / "docs" / "01-komrad-handout.md",
            ROOT / "komrad" / "docs" / "02-virtualbox-komrad-stand.md",
            ROOT / "komrad" / "docs" / "03-practice-variants.md",
            ROOT / "komrad" / "docs" / "04-practice-report-template.md",
            ROOT / "komrad" / "docs" / "05-student-faq.md",
        )
        event_date = re.compile(r"(?:\b\d{1,2}[./-]\d{1,2}[./-]2026\b|\b\d{1,2}\s+[а-яё]+\s+2026\s+года\b)", re.I)
        for path in paths:
            with self.subTest(path=path.name):
                self.assertIsNone(event_date.search(path.read_text(encoding="utf-8")))

        sources = (ROOT / "komrad" / "docs" / "06-sources.md").read_text(encoding="utf-8")
        self.assertNotIn("Дата занятия по расписанию", sources)


if __name__ == "__main__":
    unittest.main(verbosity=2)
