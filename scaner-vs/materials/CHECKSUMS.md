# SHA-256 архивов лабораторных материалов

Контрольные суммы актуальны для последней пересборки опубликованного комплекта.

```text
20B28B85EA5C8FA6A8968A28138B8492F049FB87DC9C62F1F7ED9FDF7EEF56D8  all-labs-markdown.zip
71BE4D696C4AA014FBE385539DE06A4D2A6504F44AF162EAFBE9B964D8A2900E  inspector-labs-markdown.zip
1F3B7AFB0C3E889F5A45B536D9E52434582A582F6B5ABE9FFFB1013BE346B1D1  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
