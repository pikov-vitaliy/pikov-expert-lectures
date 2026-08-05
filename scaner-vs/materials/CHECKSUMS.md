# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
AD34C621641D5577AA8E9700860F29F4F2BE9650D1964BF60DDD1C90AA794246  all-labs-markdown.zip
0616A46A1BD337FBA721AF6C0BF1E56D6E750F7FC96B925B147864C30323A469  inspector-labs-markdown.zip
E7BE157011462A9401C95B72CA4EC92C06C45A469ADB5E374757C0BA773700B7  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
