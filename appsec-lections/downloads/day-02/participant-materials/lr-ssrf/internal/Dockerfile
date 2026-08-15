FROM python:3.12-alpine@sha256:78098ea6a3a9c6a7727a5d4674e4a44e57e01fac878ee9cb4d24a86bd93916ff

RUN adduser -D -u 10002 internaluser
WORKDIR /app
COPY --chown=internaluser:internaluser app.py /app/app.py
USER internaluser
EXPOSE 9000
CMD ["python", "/app/app.py"]
