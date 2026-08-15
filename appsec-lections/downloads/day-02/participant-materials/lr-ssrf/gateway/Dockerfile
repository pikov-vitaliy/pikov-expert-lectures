FROM python:3.12-alpine@sha256:78098ea6a3a9c6a7727a5d4674e4a44e57e01fac878ee9cb4d24a86bd93916ff

RUN adduser -D -u 10003 gatewayuser
WORKDIR /app
COPY --chown=gatewayuser:gatewayuser gateway.py /app/gateway.py
USER gatewayuser
EXPOSE 8080
CMD ["python", "/app/gateway.py"]
