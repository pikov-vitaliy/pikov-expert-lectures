FROM python:3.12-alpine@sha256:78098ea6a3a9c6a7727a5d4674e4a44e57e01fac878ee9cb4d24a86bd93916ff

RUN adduser -D -u 10001 appuser
WORKDIR /app
COPY --chown=appuser:appuser app.py /app/app.py
USER appuser
EXPOSE 8080
CMD ["python", "/app/app.py"]
