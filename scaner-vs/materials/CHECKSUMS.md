# SHA-256 архивов лабораторных материалов

Проверено для опубликованного комплекта от 05.08.2026.

```text
895589CFBA1052BC726F1876F029580161C18BE8E6675BA9D16A88F9C323B0E3  all-labs-markdown.zip
5721DCD68848471F0FFDB513E06E8A4C392C8E44130377B523087B898162571F  inspector-labs-markdown.zip
1877BDB0C0B02B6C75B51A3644F4FD13D0165D5CD5D315D10094B03FE05744B0  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
