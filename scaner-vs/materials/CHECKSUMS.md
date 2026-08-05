# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
00BB096276073E5021D88A6E6E76C3A5DD50F33CB438521E6E5F4CF4FE061BF4  all-labs-markdown.zip
B3E7853AD3B087041C7C29D2AD6CA24F1E97464B50962D94A9CF7FC63C79D7D2  inspector-labs-markdown.zip
E68E8B3173B53B90676F9C45D4B1DFF6351C46D30A387E6249CBB0C35A5F9EB4  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
