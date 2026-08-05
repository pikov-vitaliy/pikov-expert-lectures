# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
4041397BAC8B9679E5C3DD8898D0E3828794ABB9E389F6376AB9CDB5DA084C38  all-labs-markdown.zip
17E12C7C5CA2CD33B99F070B4B8E0BB98B9E30A7C3DB061F45BD6BA99369EF57  inspector-labs-markdown.zip
E9A6882ECD0510CD16AB72E9FE810B4D57B0A107AA02A43EAE49FD15B8B75E70  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
