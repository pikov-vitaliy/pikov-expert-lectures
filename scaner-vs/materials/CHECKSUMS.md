# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
FF88735EA70BCB5E4C43C12226B1C30C721F47C71746790EF3DF07C147111CD0  all-labs-markdown.zip
E71D2ACA238954AFF364E4B7B8DE7F53DF8BCD0418BC8EEBAF851DAE4B91EB39  inspector-labs-markdown.zip
F0A1A31FD6EFCA447894365E15E920A6CDEFC381CF03A042304C29B305E666C0  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
