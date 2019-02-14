/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelSandbox = require('./LevelSandbox.js');
const Block = require('./Block.js');

class Blockchain {

    constructor() {
        this.bd = new LevelSandbox.LevelSandbox();
        this.generateGenesisBlock().then((result) => {
            if(result){
                console.log(result);
            }
        });
    }

    generateGenesisBlock(){
        return new Promise((resolve, reject) => {
            this.getBlockHeight().then((height) => {
                if(height === -1) {
                    let genesisBlock = new Block.Block("Genesis block");
                    this.addNewBlock(genesisBlock).then((block) => {
                        resolve(genesisBlock);
                    });
                } else {
                    resolve(null);
                }
            }).catch((err) => { console.log(err)});
        });
        
    }

    // Get block height
    getBlockHeight() {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.getBlocksCount().then((height) => {
                resolve(height);
            }).catch((err) => { console.log(err); resolve(-1)});
        });    
    }

    // Add new block
    addNewBlock(block) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.getBlockHeight().then((height) => {
                block.height = height + 1;
                return self.bd.getLevelDBData(height);
            }).then((previousBlockBD) => {
                if (previousBlockBD) {
                    let previousBlock = JSON.parse(previousBlockBD);
                    block.previousBlockHash = previousBlock.hash;
                    block.hash = SHA256(JSON.stringify(block)).toString();
                } else {
                    block.hash = SHA256(JSON.stringify(block)).toString();
                }
                return self.bd.addLevelDBData(block.height, JSON.stringify(block).toString());
            }).then((result) => {
                if(!result) {
                    console.log("Error Adding new block to the chain");
                    reject(new TypeError("Error Adding new block to the chain"));
                }
                resolve(result);
            }).catch((err) => { console.log(err); reject(err)});
        });
    }

    // Get Block By Height
    getBlock(height) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.getLevelDBData(height).then( (blockDB) => {
                if(blockDB){
                    let block = JSON.parse(blockDB);
                    resolve(block);
                } else {
                    resolve(undefined);
                }
            }).catch((err) => { console.log(err); reject(err)});
        });
    }

    // Get Whole Chain
    getBlockChain() {
        let chain = [];
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.getAllBlocks().then( (blocks) => {
                for (let i = 0; i < blocks.length; i++) {
                    let block = JSON.parse(blocks[i].value);
                    chain.push(block);
                }
                resolve(chain.sort( (a, b) => { return a.height - b.height}));
            }).catch((err) => { console.log(err); reject(err)});
        });
    }

    // Validate if Block is being tampered by Block Height
    validateBlock(height) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.getBlock(height).then((block) => {
                const blockHash = block.hash;
                block.hash = "";
                const validBlockHash = SHA256(JSON.stringify(block)).toString();
                if(validBlockHash === blockHash) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }).catch((err) => { reject(err); });
        });
    }

    // Validate Blockchain
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise( (resolve, reject) => {
            self.getBlockChain().then((chain) => {
                let promises = [];
                let chainIndex = 0;
                chain.forEach(block => {
                    promises.push(self.validateBlock(block.height));
                    if(block.height > 0) {
                        let previousBlockHash = block.previousBlockHash;
                        let blockHash = chain[chainIndex-1].hash;
                        if(blockHash != previousBlockHash){
                            errorLog.push(`Error - Block Heigh: ${block.height} - Previous Hash don't match.`);
                        }
                    }
                    chainIndex++;
                });
                Promise.all(promises).then((results) => {
                    chainIndex = 0;
                    results.forEach(valid => {
                        if(!valid){
                            errorLog.push(`Error - Block Heigh: ${chain[chainIndex].height} - Has been Tampered.`);
                        }
                        chainIndex++;
                    });
                    resolve(errorLog);
                }).catch((err) => { console.log(err); reject(err)});
            }).catch((err) => { console.log(err); reject(err)});
        });
    }

    //Utility Method to Tamper a Block for Test Validation
    _modifyBlock(height, block) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
                resolve(blockModified);
            }).catch((err) => { console.log(err); reject(err)});
        });
    }
   
}

module.exports.Blockchain = Blockchain;