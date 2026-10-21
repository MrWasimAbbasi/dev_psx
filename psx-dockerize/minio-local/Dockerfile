# Docker Hub no longer serves minio/minio, and dl.min.io returns 410.
# This image wraps the MinIO binary already shipped in the repo as minio.deb.
FROM redis:7-alpine
COPY minio /usr/local/bin/minio
ENTRYPOINT ["/usr/local/bin/minio"]
