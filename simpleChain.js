/*=========================================
|Configure your application to use levelDB| 
|to persist blockchain dataset            |
|=========================================*/
const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/*===== SHA256 with Crypto-js ===============================
| Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|==========================================================*/
const SHA256 = require('crypto-js/sha256');


/* ===== Block Class ==============================
|  Class with a constructor for block 			      |
| ===============================================*/
class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor() {
/*============================================|
|Genesis block persists as the first block in | 
|the blockchain using LevelDB with height=0.  |             
|============================================*/
		this.getBlockHeight().then((blockHeight) => {
		  if (blockHeight == -1) {
        this.addBlock(new Block("First block in the chain - Genesis block"));
	    }
	  });
  }

/*============================================|
|addBlock(newBlock) function includes a method| 
|to store newBlock with LevelDB.              |
|============================================*/
  // Add new block
  async addBlock(newBlock){
    const height = parseInt(await this.getBlockHeight());
		newBlock.height = height + 1;
		// UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if(newBlock.height > 0){
			const previousBlock = await this.getBlock(height);
      newBlock.previousBlockHash = previousBlock.hash;
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
		await this.saveBlockToLevelDB(newBlock.height, JSON.stringify(newBlock));
  }

/*===================================================|
|Modify getBlock(height) function to retrieve a block| 
|by its block height within the LevelDB chain        |       |
|===================================================*/
    async getBlockHeight(){
			return await this.getBlockHeightFromLevelDB() - 1;
    }

/*===================================================|
|Modify getBlockHeight() function to retrieve current| 
|block height within the LevelDB chain.              |
|===================================================*/    
    // get block
    async getBlock(blockHeight){
			return JSON.parse(await this.getBlockFromLevelDB(blockHeight));
    }

/*======================================|
|Modify the validateBlock() function to |
|validate a block stored within levelDB |             
|======================================*/
    // validate block
    async validateBlock(blockHeight){
      // get block object
      let block = await this.getBlock(blockHeight);
      // get block hash
      let blockHash = block.hash;
      // remove block hash to test block integrity
      block.hash = '';
      // generate block hash
      let validBlockHash = SHA256(JSON.stringify(block)).toString();
      // Compare
      if (blockHash===validBlockHash) {
          return true;
        } else {
          console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
          return false;
        }
    }

/*==============================================|
|Modify the validateChain() function to validate| 
|blockchain stored within levelDB               |
|==============================================*/    
   // Validate blockchain
  async validateChain(){
		let errorLog = [];
    const blockHeight = await this.getBlockHeightFromLevelDB();
		for (let i = 0; i < blockHeight; i++) {
		  this.validateBlock(i).then(isValid => {
				if (!isValid) {
					errorLog.push(i)
				}

				if (i == blockHeight -1) {
					if (errorLog.length > 0) {
						console.log('Number of block errors = ' + errorLog.length);
						console.log('Blocks with errors: ' + errorLog);
					} else {
						console.log('Blockchain valid');
					}
				}
			 });
		}
  }
  
  /* ===== level db methods =====================================
  |  Methods responsible for persisting data     		          |
  |  Learn more: level: https://github.com/Level/level      	|
  |  ==========================================================*/

 // Data Layer
 // Use LevelDB to persist blockchain
	saveBlockToLevelDB(key, value) {
		return new Promise((resolve, reject) => {
			db.put(key, value, function(err) {
				if (err) {
					console.log('Block ' + key + ' save to levelDB failed', err);
					reject();
				} else {
					resolve();
				}
			})
 		})
	}
  getBlockFromLevelDB(key) {
		return new Promise((resolve, reject) => {
      db.get(key, function (err, value) {
				if (err) {
					console.log('Unable to find Block ' + key + ' in levelDB', err);
					reject(err);
				} else {
					resolve(value);
				}
      })
    })
  }
	getBlockHeightFromLevelDB() {
    return new Promise((resolve, reject) => {
      let i = 0; //trigger genesis block file empty;
      db.createReadStream().on('data', (data) => {
        i++
      }).on('error', (err) => {
				console.log('failed to read', err)
        resolve(err);
      }).on('close', () => {
        resolve(i)
      })
    })
  }
} //Blochchain

/* ===== Testing ==============================================================|
|                                                                              |
|  Test adding and retrieval of blocks from peristent store                    |
|																																							 |
|  ===========================================================================*/
let blockchain = new Blockchain();
(function theLoop (i) {
  setTimeout(function () {
    blockchain.addBlock(new Block('Block ' + i + ' added to levelDB')).then(() => {
      if (--i) theLoop(i);
    })
  }, 100);
})(10);

//validate chain
setTimeout(() => blockchain.validateChain(), 5000);
