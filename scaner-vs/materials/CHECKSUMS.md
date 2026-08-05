# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
B98DC942A6EA26D522E1EA9432D548A8EBFB2012947D1F0087ECEABEEEE95E3B  all-labs-markdown.zip
67F590B21C946BD32B02E6D4FF523329453227400E8293A815D370B27FA11C83  inspector-labs-markdown.zip
F5B57AE3B72711A6E9C81B99D457D1922B60AE074561CC4CD1E3FC86FA83335D  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
