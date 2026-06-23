# 자동 배포 (GitHub Actions → EC2 + PM2)

`main` 브랜치 push 시 GitHub Actions가 EC2에 SSH 접속 후 `deploy.sh`를 실행합니다.

## GitHub Secrets

| Secret | 설명 | 예시 |
|--------|------|------|
| `SERVER_HOST` | EC2 공인 IP 또는 도메인 | `13.209.46.108` |
| `SERVER_USER` | SSH 사용자 | `ec2-user` |
| `SERVER_SSH_KEY` | **PEM private key 전체** | 아래 참고 |

### SERVER_SSH_KEY 등록 방법

1. 로컬 `key-pair/my-key.pem` 파일을 메모장이 아닌 **VS Code** 등으로 엽니다.
2. **아래 줄부터 위 줄까지 전부** 복사합니다.

```
-----BEGIN RSA PRIVATE KEY-----
(중간 내용 여러 줄)
-----END RSA PRIVATE KEY-----
```

또는

```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

3. GitHub → **Settings → Secrets and variables → Actions → New secret**
4. Name: `SERVER_SSH_KEY`
5. Value: 복사한 내용 **그대로** 붙여넣기 (앞뒤 공백 없이)
6. 저장 후 **Actions → Deploy → Re-run jobs**

### 자주 나는 오류

| 로그 | 원인 | 해결 |
|------|------|------|
| `ssh: no key found` | 키 형식이 깨짐 / 일부만 붙여넣음 | PEM **전체** 다시 등록 |
| `unable to authenticate` | 잘못된 키 또는 EC2에 공개키 미등록 | 올바른 `.pem` 사용, EC2 key pair 확인 |
| `pm2 command not found` | 서버 PATH 문제 | `npm install -g pm2` 후 `pm2 startup` |

OpenSSH 형식 키가 안 되면 PEM으로 변환:

```bash
ssh-keygen -p -m PEM -f my-key.pem
```

## 서버 경로

```
/var/www/bullslong
```

## deploy.sh 실행 순서

1. `git pull origin main`
2. `alembic upgrade head`
3. `pip install -r backend/requirements.txt`
4. `pm2 restart all`

## 수동 배포

```bash
cd /var/www/bullslong
bash deploy.sh
```

## Actions 확인

GitHub → **Actions** → **Deploy** 워크플로에서 성공/실패 로그를 확인합니다.
