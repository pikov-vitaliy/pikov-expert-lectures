# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
CBDB9251268D852C3F75AA27579F377E33BE92BF0F106F3A1067B474957BD298  all-labs-markdown.zip
B8D562E2B441853D9AA78FC9C12A7A6A5C593DF54BE8E5443373EDEAD3FD6305  inspector-labs-markdown.zip
077ED3691EA6FE4AE3451F544C99274E1C90FA8733477AF4A661984503900217  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
