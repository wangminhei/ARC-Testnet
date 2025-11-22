const { ethers } = require('ethers');
const readline = require('readline');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

const logger = {
  info: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  proxy: (msg) => console.log(`${colors.blue}[🔒] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('╭─────────────────────────────────────────────────────────────────────────────────────╮');
    console.log('│                                                                                         │');
    console.log(`│${colors.magenta}                        🚀 ARC TESTNET AUTOMATION V2.1 🚀                     ${colors.cyan}│`);
    console.log(`│${colors.yellow}                       Bộ công cụ tự động đa ví - WangMinHei             ${colors.cyan}│`);
    console.log('│                                                                                         │');
    console.log('╰─────────────────────────────────────────────────────────────────────────────────────╯');
    console.log(`${colors.reset}\n`);
  }
};

// Configuration
const CONFIG = {
  RPC_URL: 'https://rpc.testnet.arc.network',
  CHAIN_ID: 5042002,
  FAUCET_API_URL: 'https://api.circle.com/v1/faucet/drips',
  FAUCET_WEB_URL: 'https://faucet.circle.com',
  FAUCET_CHAIN: 'ARC_TESTNET',
  MIN_BALANCE: 0.001,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000,
  RATE_LIMIT_WAIT: 1800000, // 30 minutes
  TX_WAIT_TIME: 10000, // 10 seconds
};

const CONTRACTS = {
  NFT: '0x632176D769aB950bb27cA00fDa81cfcb1886d082',
  USDC: '0x3600000000000000000000000000000000000000',
  NAME_REGISTRY: '0x76a816EFa69e3183972ff7a231F5C8d7b065d9De'
};

const NFT_ABI = [
  'function mint(uint256 amount) external'
];

const TOKEN_BYTECODE = '0x60806040819052600780546001600160a01b0319167338cb0184b802629c8a93235cc6c058f5a6cc8f8417905561119338819003908190833981016040819052610048916104ae565b338383600361005783826105a9565b50600461006482826105a9565b5050506001600160a01b03811661009657604051631e4fbdf760e01b8152600060048201526024015b60405180910390fd5b61009f81610235565b5060016006556521a6bbdb50003410156101075760405162461bcd60e51b815260206004820152602360248201527f4372656174696f6e206665652072657175697265643a20302e3030303033372060448201526208aa8960eb1b606482015260840161008d565b600081116101445760405162461bcd60e51b815260206004820152600a6024820152690537570706c79203d20360b41b604482015260640161008d565b6007546040516000916001600160a01b03169034908381818185875af1925050503d8060008114610191576040519150601f19603f3d011682016040523d82523d6000602084013e610196565b606091505b50509050806101e75760405162461bcd60e51b815260206004820152601360248201527f466565207472616e73666572206661696c656400000000000000000000000000604482015260640161008d565b6101f13383610287565b7f35d0b9713cc4b54bb91a9bfa420b091d37c592d49a7468dafe20b4cfbdfca02a84848460405161022493929190610693565b60405180910390a1505050506106f0565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b0382166102b15760405163ec442f0560e01b81526000600482015260240161008d565b6102bd600083836102c1565b5050565b6001600160a01b0383166102ec5780600260008282546102e191906106c9565b9091555061035e9050565b6001600160a01b0383166000908152602081905260409020548181101561033f5760405163391434e360e21b81526001600160a01b0385166004820152602481018290526044810183905260640161008d565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b03821661037a57600280548290039055610399565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516103de91815260200190565b60405180910390a3505050565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561041c578181015183820152602001610404565b50506000910152565b600082601f83011261043657600080fd5b81516001600160401b0381111561044f5761044f6103eb565b604051601f8201601f19908116603f011681016001600160401b038111828210171561047d5761047d6103eb565b60405281815283820160200185101561049557600080fd5b6104a6826020830160208701610401565b949350505050565b6000806000606084860312156104c357600080fd5b83516001600160401b038111156104d957600080fd5b6104e586828701610425565b602086015190945090506001600160401b0381111561050357600080fd5b61050f86828701610425565b925050604084015190509250925092565b600181811c9082168061053457607f821691505b60208210810361055457634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156105a457806000526020600020601f840160051c810160208510156105815750805b601f840160051c820191505b818110156105a1576000815560010161058d565b50505b505050565b81516001600160401b038111156105c2576105c26103eb565b6105d6816105d08454610520565b8461055a565b6020601f82116001811461060a57600083156105f25750848201515b600019600385901b1c1916600184901b1784556105a1565b600084815260208120601f198516915b8281101561063a578785015182556020948501946001909201910161061a565b50848210156106585786840151600019600387901b60f8161c191681555b50505050600190811b01905550565b6000815180845261067f816020860160208601610401565b601f01601f19169290920160200192915050565b6060815260006106a66060830186610667565b82810360208401526106b88186610667565b915050826040830152949350505050565b808201808211156106ea57634e487b7160e01b600052601160045260246000fd5b92915050565b610a94806106ff6000396000f3fe6080604052600436106100e15760003560e01c80638831e9cf1161007f578063a9059cbb11610059578063a9059cbb146102f3578063dd62ed3e14610313578063f2fde38b14610359578063fa2af9da1461037957600080fd5b80638831e9cf1461028c5780638da5cb5b146102ac57806395d89b41146102de57600080fd5b806323b872dd116100bb57806323b872dd14610205578063313ce5671461022557806370a0823114610241578063715018a61461027757600080fd5b806306fdde031461018b578063095ea7b3146101b657806318160ddd146101e657600080fd5b36610186576007546040516000916001600160a01b03169034908381818185875af1925050503d8060008114610133576040519150601f19603f3d011682016040523d82523d6000602084013e610138565b606091505b50509050806101845760405162461bcd60e51b8152602060048201526013602482015272119959481d1c985b9cd9995c8819985a5b1959606a1b60448201526064015b60405180910390fd5b005b600080fd5b34801561019757600080fd5b506101a0610399565b6040516101ad91906108dd565b60405180910390f35b3480156101c257600080fd5b506101d66101d1366004610947565b61042b565b60405190151581526020016101ad565b3480156101f257600080fd5b506002545b6040519081526020016101ad565b34801561021157600080fd5b506101d6610220366004610971565b610445565b34801561023157600080fd5b50604051601281526020016101ad565b34801561024d57600080fd5b506101f761025c3660046109ae565b6001600160a01b031660009081526020819052604090205490565b34801561028357600080fd5b50610184610469565b34801561029857600080fd5b506101846102a73660046109ae565b61047d565b3480156102b857600080fd5b506005546001600160a01b03165b6040516001600160a01b0390911681526020016101ad565b3480156102ea57600080fd5b506101a0610514565b3480156102ff57600080fd5b506101d661030e366004610947565b610523565b34801561031f57600080fd5b506101f761032e3660046109d0565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b34801561036557600080fd5b506101846103743660046109ae565b610531565b34801561038557600080fd5b506007546102c6906001600160a01b031681565b6060600380546103a890610a03565b80601f01602080910402602001604051908101604052809291908181526020018280546103d590610a03565b80156104215780601f106103f657610100808354040283529160200191610421565b820191906000526020600020905b81548152906001019060200180831161040457829003601f168201915b5050505050905090565b60003361043981858561056f565b60019150505b92915050565b600033610453858285610581565b61045e858585610600565b506001949350505050565b61047161065f565b61047b600061068c565b565b61048561065f565b6001600160a01b0381166104ca5760405162461bcd60e51b815260206004820152600c60248201526b5a65726f206164647265737360a01b604482015260640161017b565b600780546001600160a01b0319166001600160a01b0383169081179091556040517f73238e3ae0a71b401b31ae67204506d074de41bd5c084082fba9b64b1c7fa28f90600090a250565b6060600480546103a890610a03565b600033610439818585610600565b61053961065f565b6001600160a01b03811661056357604051631e4fbdf760e01b81526000600482015260240161017b565b61056c8161068c565b50565b61057c83838360016106de565b505050565b6001600160a01b038381166000908152600160209081526040808320938616835292905220546000198110156105fa57818110156105eb57604051637dc7a0d960e11b81526001600160a01b0384166004820152602481018290526044810183905260640161017b565b6105fa848484840360006106de565b50505050565b6001600160a01b03831661062a57604051634b637e8f60e11b81526000600482015260240161017b565b6001600160a01b0382166106545760405163ec442f0560e01b81526000600482015260240161017b565b61057c8383836107b3565b6005546001600160a01b0316331461047b5760405163118cdaa760e01b815233600482015260240161017b565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b0384166107085760405163e602df0560e01b81526000600482015260240161017b565b6001600160a01b03831661073257604051634a1406b160e11b81526000600482015260240161017b565b6001600160a01b03808516600090815260016020908152604080832093871683529290522082905580156105fa57826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516107a591815260200190565b60405180910390a350505050565b6001600160a01b0383166107de5780600260008282546107d39190610a3d565b909155506108509050565b6001600160a01b038316600090815260208190526040902054818110156108315760405163391434e360e21b81526001600160a01b0385166004820152602481018290526044810183905260640161017b565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b03821661086c5760028054829003905561088b565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516108d091815260200190565b60405180910390a3505050565b602081526000825180602084015260005b8181101561090b57602081860181015160408684010152016108ee565b506000604082850101526040601f19601f83011684010191505092915050565b80356001600160a01b038116811461094257600080fd5b919050565b6000806040838503121561095a57600080fd5b6109638361092b565b946020939093013593505050565b60008060006060848603121561098657600080fd5b61098f8461092b565b925061099d6020850161092b565b929592945050506040919091013590565b6000602082840312156109c057600080fd5b6109c98261092b565b9392505050565b600080604083850312156109e357600080fd5b6109ec8361092b565b91506109fa6020840161092b565b90509250929050565b600181811c90821680610a1757607f821691505b602082108103610a3757634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561043f57634e487b7160e01b600052601160045260246000fdfea264697066735822122022a75f40070b6dc7dbe5fa6faf63e32f1ba0e9d418e1bc65bb94efd49920287964736f6c634300081a0033';

const NAME_REGISTRY_ABI = [
  'function register(string name, address owner) external payable'
];

// Stats tracking
const stats = {
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  faucetClaims: 0,
  nftsMinted: 0,
  tokensDeployed: 0,
  namesRegistered: 0,
  startTime: Date.now()
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Proxy management
let proxies = [];
let currentProxyIndex = 0;

function loadProxies() {
  try {
    if (fs.existsSync('proxy.txt')) {
      const content = fs.readFileSync('proxy.txt', 'utf-8');
      proxies = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes(':'));
      
      if (proxies.length > 0) {
        logger.success(`Đã tải ${proxies.length} proxy`);
      } else {
        logger.warn('Không tìm thấy proxy trong proxy.txt, chạy không dùng proxy');
      }
    } else {
      logger.warn('Không tìm thấy file proxy.txt, chạy không dùng proxy');
    }
  } catch (error) {
    logger.warn(`Lỗi khi tải proxy: ${error.message}, chạy không dùng proxy`);
  }
}

function getNextProxy() {
  if (proxies.length === 0) return null;
  
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

function getProxyAgent(proxy) {
  if (!proxy) return undefined;
  return new HttpsProxyAgent(`http://${proxy}`);
}

function loadWallets() {
  const wallets = [];
  
  try {
    if (!fs.existsSync('pv.txt')) {
      logger.error('Không tìm thấy file pv.txt!');
      process.exit(1);
    }
    
    const content = fs.readFileSync('pv.txt', 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      let privateKey, walletName, proxy;
      
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        privateKey = parts[0].trim();
        walletName = parts[1] ? parts[1].trim() : 'Unknown';
        
        if (parts.length >= 3 && parts[2].trim()) {
          proxy = parts.slice(2).join(':').trim();
        }
      } else {
        privateKey = trimmed;
        walletName = 'Unknown';
      }
      
      try {
        const wallet = new ethers.Wallet(privateKey);
        wallets.push({
          wallet,
          name: walletName,
          proxy: proxy || null
        });
      } catch (error) {
        logger.error(`Khóa riêng không hợp lệ: ${error.message}`);
      }
    }
    
    if (wallets.length === 0) {
      logger.error('Không tìm thấy ví hợp lệ trong pv.txt!');
      process.exit(1);
    }
    
    logger.success(`Đã tải ${wallets.length} ví`);
    return wallets;
    
  } catch (error) {
    logger.error(`Lỗi khi tải ví: ${error.message}`);
    process.exit(1);
  }
}

function getProvider(walletData) {
  const proxy = walletData.proxy || getNextProxy();
  
  if (proxy) {
    logger.proxy(`Sử dụng proxy: ${proxy}`);
    const agent = getProxyAgent(proxy);
    
    return new ethers.JsonRpcProvider(CONFIG.RPC_URL, {
      chainId: CONFIG.CHAIN_ID,
      name: 'Arc Testnet'
    }, {
      fetchOptions: {
        agent
      }
    });
  }
  
  return new ethers.JsonRpcProvider(CONFIG.RPC_URL, {
    chainId: CONFIG.CHAIN_ID,
    name: 'Arc Testnet'
  });
}

async function retryOperation(operation, retries = CONFIG.RETRY_ATTEMPTS) {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`Thử lần ${i + 1} thất bại, thử lại sau ${CONFIG.RETRY_DELAY / 1000}s...`);
      await delay(CONFIG.RETRY_DELAY);
    }
  }
}

async function checkBalance(walletData) {
  try {
    const provider = getProvider(walletData);
    const balance = await provider.getBalance(walletData.wallet.address);
    const balanceEth = ethers.formatEther(balance);
    
    return {
      balance: balanceEth,
      sufficient: parseFloat(balanceEth) >= CONFIG.MIN_BALANCE
    };
  } catch (error) {
    logger.warn(`[${walletData.name}] Không thể kiểm tra số dư: ${error.message}`);
    return { balance: '0', sufficient: false };
  }
}

// HƯỚNG DẪN FAUCET THỦ CÔNG
function displayFaucetInstructions(address, walletName) {
  console.log(`\n${colors.yellow}${colors.bold}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.yellow}${colors.bold}💧 HƯỚNG DẪN FAUCET THỦ CÔNG${colors.reset}`);
  console.log(`${colors.yellow}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.white}Làm theo hướng dẫn sau để nhận token testnet miễn phí:${colors.reset}\n`);
  console.log(`${colors.cyan}Wallet: ${colors.white}[${walletName}]${colors.reset}`);
  console.log(`${colors.cyan}Địa chỉ: ${colors.white}${address}${colors.reset}\n`);
  console.log(`${colors.green}${colors.bold}📋 CÁC BƯỚC:${colors.reset}`);
  console.log(`${colors.white}1. Truy cập: ${colors.cyan}https://faucet.circle.com/${colors.reset}`);
  console.log(`${colors.white}2. Chọn mạng: ${colors.cyan}Arc Testnet${colors.reset}`);
  console.log(`${colors.white}3. Dán địa chỉ vào trường "Send to": ${colors.cyan}${address}${colors.reset}`);
  console.log(`${colors.white}4. Nhấn ${colors.green}"Send 10 USDC"${colors.reset}`);
  console.log(`${colors.white}5. Chờ xác nhận (thường là ngay lập tức)${colors.reset}\n`);
  console.log(`${colors.yellow}${colors.bold}⚠️  LƯU Ý - GIỚI HẠN YÊU CẦU:${colors.reset}`);
  console.log(`${colors.white}Nếu hiện "${colors.red}Limit exceeded${colors.white}"${colors.reset}`);
  console.log(`${colors.white}Thông báo: "Sorry, you've hit the limit. We'll have more test tokens available in 1 hour."${colors.reset}`);
  console.log(`${colors.white}${colors.bold}Cách xử lý:${colors.reset} ${colors.yellow}Chờ 1 giờ và thử lại${colors.reset}\n`);
  console.log(`${colors.cyan}${colors.bold}💡 MẸO:${colors.reset}`);
  console.log(`${colors.white}• Giới hạn: 1 yêu cầu/giờ cho mỗi địa chỉ${colors.reset}`);
  console.log(`${colors.white}• Bạn sẽ nhận: 10 USDC + token native${colors.reset}`);
  console.log(`${colors.white}• Miễn phí, không cần đăng nhập${colors.reset}`);
  console.log(`${colors.white}• Áp dụng cho Arc Testnet và một số mạng khác${colors.reset}\n`);
  console.log(`${colors.yellow}${'═'.repeat(70)}${colors.reset}\n`);
}

async function promptFaucetClaimed() {
  const answer = await question(`${colors.green}Bạn đã yêu cầu token từ faucet chưa? (s/n): ${colors.reset}`);
  return answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function manualFaucetFlow(walletsData) {
  console.log(`\n${colors.magenta}${colors.bold}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}💧 HƯỚNG DẪN FAUCET THỦ CÔNG - TỪNG BƯỚC${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}${'═'.repeat(70)}${colors.reset}\n`);
  
  logger.info('Quy trình này sẽ hướng dẫn bạn yêu cầu token thủ công cho từng ví.\n');
  
  for (let i = 0; i < walletsData.length; i++) {
    const walletData = walletsData[i];
    
    console.log(`\n${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}Ví ${i + 1}/${walletsData.length}${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
    
    // Check balance first
    const balanceCheck = await checkBalance(walletData);
    logger.info(`[${walletData.name}] Số dư hiện tại: ${balanceCheck.balance} ETH`);
    
    if (balanceCheck.sufficient) {
      logger.success(`[${walletData.name}] Đã có số dư đủ! Bỏ qua...`);
      continue;
    }
    
    displayFaucetInstructions(walletData.wallet.address, walletData.name);
    
    // Wait for user confirmation
    const claimed = await promptFaucetClaimed();
    
    if (claimed) {
      logger.info('Đang chờ xác nhận trên blockchain (20 giây)...');
      await delay(20000);
      
      // Check balance again
      const newBalance = await checkBalance(walletData);
      logger.info(`[${walletData.name}] Số dư mới: ${newBalance.balance} ETH`);
      
      if (newBalance.sufficient) {
        logger.success(`[${walletData.name}] Đã nhận token thành công!`);
        stats.faucetClaims++;
      } else {
        logger.warn(`[${walletData.name}] Token chưa hiển thị. Có thể mất vài phút.`);
        logger.info(`[${walletData.name}] Bạn có thể tiếp tục, bot sẽ xử lý khi có số dư.`);
      }
    } else {
      logger.warn(`[${walletData.name}] Bỏ qua ví này. Bạn có thể yêu cầu sau.`);
    }
    
    if (i < walletsData.length - 1) {
      console.log(`\n${colors.yellow}Nhấn Enter để tiếp tục đến ví tiếp theo...${colors.reset}`);
      await question('');
    }
  }
  
  console.log(`\n${colors.green}${colors.bold}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.green}${colors.bold}✅ Hoàn tất hướng dẫn faucet thủ công!${colors.reset}`);
  console.log(`${colors.green}${colors.bold}${'═'.repeat(70)}${colors.reset}\n`);
}

async function mintNFT(walletData, amount) {
  try {
    const provider = getProvider(walletData);
    const wallet = walletData.wallet.connect(provider);
    const walletName = walletData.name;
    
    const nftContract = new ethers.Contract(CONTRACTS.NFT, NFT_ABI, wallet);
    
    logger.loading(`[${walletName}] Đang mint ${amount} NFT(s) từ ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
    
    const tx = await retryOperation(async () => {
      return await nftContract.mint(amount);
    });
    
    logger.info(`[${walletName}] TX đã gửi: ${tx.hash}`);
    stats.totalTransactions++;
    
    const receipt = await tx.wait();
    logger.success(`[${walletName}] Mint thành công! Gas đã dùng: ${receipt.gasUsed.toString()}`);
    
    stats.successfulTransactions++;
    stats.nftsMinted += amount;
    
    return { success: true, hash: tx.hash };
  } catch (error) {
    logger.error(`[${walletData.name}] Mint thất bại: ${error.message}`);
    stats.failedTransactions++;
    return { success: false, error: error.message };
  }
}

async function deployToken(walletData, name, symbol, supply) {
  try {
    const provider = getProvider(walletData);
    const wallet = walletData.wallet.connect(provider);
    const walletName = walletData.name;
    
    logger.loading(`[${walletName}] Đang triển khai token từ ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);

    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'uint256'],
      [name, symbol, ethers.parseEther(supply.toString())]
    );

    const deployData = TOKEN_BYTECODE + encodedParams.slice(2);
    const creationFee = BigInt('0x21a6bbdb5000');
    
    logger.info(`[${walletName}] Token: ${name} (${symbol}) | Tổng cung: ${supply}`);
    logger.info(`[${walletName}] Phí tạo: 0.000037 ETH`);
    
    const tx = await retryOperation(async () => {
      return await wallet.sendTransaction({
        data: deployData,
        value: creationFee,
        gasLimit: 1500000
      });
    });
    
    logger.info(`[${walletName}] TX đã gửi: ${tx.hash}`);
    stats.totalTransactions++;
    
    const receipt = await tx.wait();
    const tokenAddress = receipt.contractAddress;
    
    logger.success(`[${walletName}] Token triển khai tại: ${tokenAddress}`);
    logger.info(`[${walletName}] Gas đã dùng: ${receipt.gasUsed.toString()}`);
    
    stats.successfulTransactions++;
    stats.tokensDeployed++;
    
    return { success: true, address: tokenAddress, hash: tx.hash };
  } catch (error) {
    logger.error(`[${walletData.name}] Triển khai thất bại: ${error.message}`);
    stats.failedTransactions++;
    return { success: false, error: error.message };
  }
}

async function registerName(walletData, name) {
  try {
    const provider = getProvider(walletData);
    const wallet = walletData.wallet.connect(provider);
    const walletName = walletData.name;
    
    const registry = new ethers.Contract(CONTRACTS.NAME_REGISTRY, NAME_REGISTRY_ABI, wallet);
    
    logger.loading(`[${walletName}] Đang đăng ký tên "${name}" từ ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
    
    const tx = await retryOperation(async () => {
      return await registry.register(
        name,
        ethers.ZeroAddress,
        { value: ethers.parseEther('1') }
      );
    });
    
    logger.info(`[${walletName}] TX đã gửi: ${tx.hash}`);
    stats.totalTransactions++;
    
    const receipt = await tx.wait();
    logger.success(`[${walletName}] Đăng ký tên thành công! Gas đã dùng: ${receipt.gasUsed.toString()}`);
    
    stats.successfulTransactions++;
    stats.namesRegistered++;
    
    return { success: true, hash: tx.hash };
  } catch (error) {
    logger.error(`[${walletData.name}] Đăng ký thất bại: ${error.message}`);
    stats.failedTransactions++;
    return { success: false, error: error.message };
  }
}

async function autoAll(walletsData) {
  try {
    logger.info(`\n${colors.magenta}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
    logger.info(`${colors.magenta}${colors.bold}🚀 CHẾ ĐỘ TỰ ĐỘNG TOÀN BỘ - AUTO ALL 🚀${colors.reset}`);
    logger.info(`${colors.magenta}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
    logger.info(`${colors.cyan}Chương trình sẽ thực thi các thao tác cho ví có đủ số dư:${colors.reset}`);
    logger.info(`${colors.white}1. Kiểm tra số dư${colors.reset}`);
    logger.info(`${colors.white}2. Mint NFT${colors.reset}`);
    logger.info(`${colors.white}3. Triển khai Token${colors.reset}`);
    logger.info(`${colors.white}4. Đăng ký tên${colors.reset}\n`);
    
    // STEP 1: Check balances
    logger.info(`${colors.cyan}${colors.bold}[BƯỚC 1/4] Kiểm tra số dư...${colors.reset}`);
    logger.info(`${'─'.repeat(60)}\n`);
    
    const walletsWithBalance = [];
    const walletsNeedingFunds = [];
    
    for (const walletData of walletsData) {
      const balanceCheck = await checkBalance(walletData);
      logger.info(`[${walletData.name}] Số dư: ${balanceCheck.balance} ETH`);
      
      if (balanceCheck.sufficient) {
        walletsWithBalance.push(walletData);
      } else {
        walletsNeedingFunds.push(walletData);
      }
    }
    
    if (walletsNeedingFunds.length > 0) {
      logger.warn(`\n⚠️  Có ${walletsNeedingFunds.length} ví không có đủ số dư!`);
      logger.info(`💡 Sử dụng mục 4 (Hướng dẫn Faucet thủ công) để lấy token`);
      logger.info(`   Truy cập: ${colors.cyan}https://faucet.circle.com/${colors.reset}\n`);
      
      const proceed = await question(`${colors.yellow}Bạn có muốn tiếp tục chỉ với ${walletsWithBalance.length} ví có số dư không? (s/n): ${colors.reset}`);
      
      if (proceed.toLowerCase() !== 's' && proceed.toLowerCase() !== 'sim') {
        logger.info('Người dùng đã hủy thao tác.');
        return;
      }
    }
    
    if (walletsWithBalance.length === 0) {
      logger.error('Không có ví nào có đủ số dư!');
      logger.info('Sử dụng mục 4 (Hướng dẫn Faucet thủ công) để lấy token.');
      return;
    }
    
    logger.success(`\n✅ Đang xử lý ${walletsWithBalance.length} ví có đủ số dư!\n`);
    await delay(3000);
    
    // STEP 2-4: Execute operations for each wallet with balance
    for (let i = 0; i < walletsWithBalance.length; i++) {
      const walletData = walletsWithBalance[i];
      const walletName = walletData.name;
      
      console.log(`\n${colors.magenta}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
      console.log(`${colors.yellow}${colors.bold}Đang xử lý ví ${i + 1}/${walletsWithBalance.length}: ${walletName}${colors.reset}`);
      console.log(`${colors.magenta}${colors.bold}${'═'.repeat(60)}${colors.reset}\n`);
      
      // MINT NFT
      logger.info(`${colors.cyan}[BƯỚC 2/4] Đang mint NFT...${colors.reset}`);
      await mintNFT(walletData, 1);
      await delay(5000);
      
      // DEPLOY TOKEN
      logger.info(`\n${colors.cyan}[BƯỚC 3/4] Đang triển khai Token...${colors.reset}`);
      const randomName = `Token${Math.random().toString(36).substring(2, 8)}`;
      const randomSymbol = `TK${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await deployToken(walletData, randomName, randomSymbol, 1000000);
      await delay(5000);
      
      // REGISTER NAME
      logger.info(`\n${colors.cyan}[BƯỚC 4/4] Đang đăng ký tên...${colors.reset}`);
      const randomDomain = `arc${Math.random().toString(36).substring(2, 10)}`;
      await registerName(walletData, randomDomain);
      
      logger.success(`\n${colors.green}✅ Ví ${walletName} hoàn tất toàn bộ thao tác!${colors.reset}`);
      
      if (i < walletsWithBalance.length - 1) {
        logger.info(`${colors.yellow}Chuyển sang ví tiếp theo sau 5 giây...${colors.reset}\n`);
        await delay(5000);
      }
    }
    
    console.log(`\n${colors.green}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}${colors.bold}🎉 AUTO ALL ĐÃ HOÀN THÀNH! 🎉${colors.reset}`);
    console.log(`${colors.green}${colors.bold}${'═'.repeat(60)}${colors.reset}\n`);
    
    displayStats();
    
  } catch (error) {
    logger.error(`Auto All thất bại: ${error.message}`);
  }
}

function displayStats() {
  const runtime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);
  
  console.log(`\n${colors.cyan}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}📊 THỐNG KÊ PHIÊN LÀM VIỆC${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.white}Thời gian chạy: ${runtime} phút${colors.reset}`);
  console.log(`${colors.white}Tổng giao dịch: ${stats.totalTransactions}${colors.reset}`);
  console.log(`${colors.green}Thành công: ${stats.successfulTransactions}${colors.reset}`);
  console.log(`${colors.red}Thất bại: ${stats.failedTransactions}${colors.reset}`);
  console.log(`${colors.yellow}Tỷ lệ thành công: ${stats.totalTransactions > 0 ? ((stats.successfulTransactions / stats.totalTransactions) * 100).toFixed(2) : 0}%${colors.reset}`);
  console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
  console.log(`${colors.white}Số lần lấy faucet (thủ công): ${stats.faucetClaims}${colors.reset}`);
  console.log(`${colors.white}NFT đã mint: ${stats.nftsMinted}${colors.reset}`);
  console.log(`${colors.white}Token đã triển khai: ${stats.tokensDeployed}${colors.reset}`);
  console.log(`${colors.white}Tên đã đăng ký: ${stats.namesRegistered}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

function displayMenu() {
  console.log(`\n${colors.cyan}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}${colors.bold}                    MENU CHÍNH${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}${colors.bold}1.${colors.reset} ${colors.white}Mint NFT${colors.reset}`);
  console.log(`${colors.green}${colors.bold}2.${colors.reset} ${colors.white}Triển khai Token${colors.reset}`);
  console.log(`${colors.green}${colors.bold}3.${colors.reset} ${colors.white}Đăng ký Tên${colors.reset}`);
  console.log(`${colors.green}${colors.bold}4.${colors.reset} ${colors.white}💧 Hướng dẫn Faucet thủ công${colors.reset}`);
  console.log(`${colors.green}${colors.bold}5.${colors.reset} ${colors.magenta}🚀 AUTO ALL (Kiểm tra + Mint + Triển khai + Đăng ký)${colors.reset}`);
  console.log(`${colors.green}${colors.bold}6.${colors.reset} ${colors.white}Kiểm tra tất cả số dư${colors.reset}`);
  console.log(`${colors.green}${colors.bold}7.${colors.reset} ${colors.white}Xem thống kê${colors.reset}`);
  console.log(`${colors.green}${colors.bold}8.${colors.reset} ${colors.white}Thoát${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
}

async function checkAllBalances(walletsData) {
  console.log(`\n${colors.cyan}${colors.bold}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}💰 SỐ DƯ CÁC VÍ${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
  
  for (const walletData of walletsData) {
    const balanceCheck = await checkBalance(walletData);
    const status = balanceCheck.sufficient ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${status} [${walletData.name}] ${walletData.wallet.address}: ${balanceCheck.balance} ETH`);
  }
  
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
}

async function main() {
  logger.banner();
  
  // Load proxies and wallets
  loadProxies();
  const walletsData = loadWallets();
  
  logger.info(`${colors.cyan}Tổng tài khoản: ${walletsData.length}${colors.reset}`);
  logger.info(`${colors.blue}Số proxy đã tải: ${proxies.length}${colors.reset}`);
  logger.info(`${colors.yellow}💧 Để nhận token testnet, dùng mục 4 (Hướng dẫn Faucet thủ công)${colors.reset}`);
  logger.info(`${colors.cyan}🌐 Faucet: https://faucet.circle.com/${colors.reset}\n`);
  
  let running = true;
  
  while (running) {
    displayMenu();
    const choice = await question(`\n${colors.green}Chọn mục (1-8): ${colors.reset}`);
    
    switch (choice.trim()) {
      case '1': {
        // Mint NFT
        const txCount = parseInt(await question('Nhập số giao dịch mỗi ví: '));
        
        for (const walletData of walletsData) {
          const balanceCheck = await checkBalance(walletData);
          if (!balanceCheck.sufficient) {
            logger.warn(`[${walletData.name}] Không đủ số dư, bỏ qua...`);
            continue;
          }
          
          for (let i = 0; i < txCount; i++) {
            await mintNFT(walletData, 1);
            if (i < txCount - 1) await delay(2000);
          }
        }
        
        logger.success('Đã hoàn tất tất cả giao dịch mint!');
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '2': {
        // Deploy Token
        const tokenName = await question('Nhập tên token: ');
        const tokenSymbol = await question('Nhập ký hiệu token: ');
        const tokenSupply = await question('Nhập tổng cung token: ');
        const txCount = parseInt(await question('Nhập số lần triển khai mỗi ví: '));
        
        for (const walletData of walletsData) {
          const balanceCheck = await checkBalance(walletData);
          if (!balanceCheck.sufficient) {
            logger.warn(`[${walletData.name}] Không đủ số dư, bỏ qua...`);
            continue;
          }
          
          for (let i = 0; i < txCount; i++) {
            const uniqueName = txCount > 1 ? `${tokenName}${i + 1}` : tokenName;
            const uniqueSymbol = txCount > 1 ? `${tokenSymbol}${i + 1}` : tokenSymbol;
            await deployToken(walletData, uniqueName, uniqueSymbol, tokenSupply);
            if (i < txCount - 1) await delay(2000);
          }
        }
        
        logger.success('Hoàn tất triển khai tất cả token!');
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '3': {
        // Register Name
        const domainName = await question('Nhập tên miền muốn đăng ký: ');
        const txCount = parseInt(await question('Nhập số lần đăng ký mỗi ví: '));
        
        for (const walletData of walletsData) {
          const balanceCheck = await checkBalance(walletData);
          if (!balanceCheck.sufficient) {
            logger.warn(`[${walletData.name}] Không đủ số dư, bỏ qua...`);
            continue;
          }
          
          for (let i = 0; i < txCount; i++) {
            const uniqueName = txCount > 1 ? `${domainName}${i + 1}` : domainName;
            await registerName(walletData, uniqueName);
            if (i < txCount - 1) await delay(2000);
          }
        }
        
        logger.success('Hoàn tất đăng ký tên!');
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '4': {
        // Manual Faucet Guide
        await manualFaucetFlow(walletsData);
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '5': {
        // Auto All
        logger.info(`${colors.yellow}Bắt đầu chế độ AUTO ALL...${colors.reset}`);
        logger.warn(`${colors.yellow}Chế độ này sẽ thực hiện toàn bộ thao tác cho các ví có số dư!${colors.reset}`);
        logger.info('Nhấn Ctrl+C bất kỳ lúc nào để dừng\n');
        await delay(3000);
        
        await autoAll(walletsData);
        
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '6': {
        // Check All Balances
        await checkAllBalances(walletsData);
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '7': {
        // View Statistics
        displayStats();
        await question('\nNhấn Enter để tiếp tục...');
        break;
      }
      
      case '8': {
        logger.info('Đang thoát chương trình...');
        displayStats();
        running = false;
        break;
      }
      
      default: {
        logger.warn('Lựa chọn không hợp lệ! Vui lòng chọn 1-8.');
        await delay(1500);
        break;
      }
    }
  }
  
  rl.close();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nĐang tắt chương trình một cách an toàn...');
  displayStats();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Lỗi chưa bắt được: ${error.message}`);
  displayStats();
  process.exit(1);
});

main().catch((error) => {
  logger.error(`Lỗi nghiêm trọng: ${error.message}`);
  displayStats();
  process.exit(1);
});
