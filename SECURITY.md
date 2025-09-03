# Security Guidelines

## Private Key Management

### ⚠️ CRITICAL: Never Commit Private Keys

This project requires a private key for blockchain transactions. Follow these rules:

1. **NEVER** commit `.env` files to git
2. **NEVER** hardcode private keys in source code
3. **NEVER** share private keys in issues, PRs, or documentation
4. **ALWAYS** use environment variables for sensitive data

### Setup Instructions

1. **Copy the template:**
   ```bash
   cp .env.template .env
   ```

2. **Add your private key to `.env`:**
   ```env
   VITE_WALLET_PRIVATE_KEY=0x_your_private_key_here
   ```

3. **Verify `.env` is gitignored:**
   ```bash
   git status
   # Should NOT show .env file
   ```

### Before Committing

Always check for sensitive data:
```bash
# Search for private keys
grep -r "0x[a-fA-F0-9]\{64\}" . --exclude-dir=node_modules --exclude-dir=dist

# Check git status
git status

# Check what will be committed
git diff --cached
```

### If You Accidentally Commit a Private Key

1. **Immediately** rotate the compromised key
2. Remove the commit from history:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push to remote (coordinate with team)
4. Consider the key permanently compromised

## Wallet Security

### Best Practices

1. **Use a dedicated wallet** for the game
2. **Only fund with necessary MON** for gas fees
3. **Monitor wallet activity** regularly
4. **Rotate keys periodically**
5. **Use hardware wallets** for production

### Required Permissions

The wallet needs:
- `GAME_ROLE` permission on the contract
- Sufficient MON for gas fees
- No other permissions or large balances

## Environment Variables

### Required Variables
- `VITE_WALLET_PRIVATE_KEY` - Game wallet private key
- `VITE_GAME_CONTRACT_ADDRESS` - Smart contract address
- `VITE_GAME_ADDRESS` - Game identifier

### Public Variables
These can be safely committed:
- `VITE_PRIVY_APP_ID` - Public app identifier
- `VITE_RPC_URL` - Public RPC endpoint
- `VITE_APP_URL` - Public app URL

## Repository Security

### Files That Should Be Gitignored
```
.env
.env.*
*.key
*.pem
*_key.txt
*_secret.txt
private_key*
secret*
```

### Safe to Commit
```
.env.template
.env.example
README.md
SECURITY.md
```

## Development vs Production

### Development
- Use testnet tokens only
- Use a separate development wallet
- Enable debug logging

### Production
- Use a secure key management service
- Implement proper access controls
- Disable debug logging
- Use environment-specific configuration

## Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** create a public issue
2. Email security concerns privately
3. Include:
   - Description of the issue
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Audit Checklist

Before deployment:
- [ ] All private keys in environment variables
- [ ] `.env` is gitignored
- [ ] No hardcoded secrets in code
- [ ] Wallet has minimal permissions
- [ ] Wallet has minimal balance
- [ ] Contract addresses verified
- [ ] RPC endpoints verified
- [ ] No sensitive data in logs
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up to date

## Common Mistakes to Avoid

1. **Committing `.env` files** - Always check git status
2. **Logging private keys** - Never log sensitive data
3. **Using mainnet keys in testnet** - Keep them separate
4. **Sharing screenshots with keys visible** - Always redact
5. **Hardcoding "temporary" keys** - They're never temporary
6. **Using the same key across projects** - Use unique keys
7. **Not rotating compromised keys** - Rotate immediately

## Tools for Security

### Check for exposed secrets:
```bash
# Install gitleaks
npm install -g gitleaks

# Scan repository
gitleaks detect --source . -v
```

### Generate a new wallet:
```javascript
// Using ethers.js or viem
import { Wallet } from 'ethers';
const wallet = Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
```

Remember: **Security is everyone's responsibility!**