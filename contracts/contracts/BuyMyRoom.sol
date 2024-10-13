// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Uncomment the line to use openzeppelin/ERC721,ERC20
// You can use this dependency directly because it has been installed by TA already
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./MyERC20.sol";

// Uncomment this line to use console.log
 import "hardhat/console.sol";

contract BuyMyRoom is ERC721 {

    uint256 public nextTokenId; // 下一个空投的房屋
    uint256 public listingFeeRate = 1;  // 平台手续费比例
    address public manager;  // 合约的所有者

    // ERC20 代币实例
    MyERC20 public myToken;

    // 记录每个用户是否已领取过房子
    mapping(address => bool) public hasClaimedHouses;

    struct House {
        address owner;
        uint256 listedTimestamp;
        uint256 price;
        bool isForSale;
    }

    mapping(uint256 => House) public houses;

    event HouseListed(uint256 tokenId, uint256 price, address owner);
    event HouseSold(uint256 tokenId, uint256 price, address newOwner);

    constructor() ERC721("HouseNFT", "HNFT") {
        manager = msg.sender;  // 合约部署者为初始所有者
        nextTokenId = 1; // 从1开始
        myToken = new MyERC20("ZJUToken", "ZJUTokenSymbol");  // 使用传入的ERC20代币合约地址
    }

    // 修饰符：限制某些功能只能由合约所有者调用
    modifier onlyManager() {
        require(msg.sender == manager, "Not the owner");
        _;
    }

    // 用户可以领取3个房子
    function airdropHouses() external {
        require(!hasClaimedHouses[msg.sender], "Houses already claimed");
        // 发行3个房子给用户
        for (uint256 i = 0; i < 3; i++) {
            _mint(msg.sender, nextTokenId);
            houses[nextTokenId] = House(msg.sender, block.timestamp, 0, false);
            nextTokenId++;
        }
        // 标记用户已经领取
        hasClaimedHouses[msg.sender] = true;
    }

    // 查询用户拥有的房屋
    function getUserHouses(address user) external view returns (uint256[] memory) {
        uint256 totalHouses = nextTokenId - 1;
        uint256 houseCount = balanceOf(user);

        uint256[] memory userHouses = new uint256[](houseCount);
        uint256 count = 0;
        for (uint256 i = 1; i <= totalHouses; i++) {
            if (ownerOf(i) == user) {
                userHouses[count] = i;
                count++;
            }
        }

        return userHouses;
    }

    // 挂单出售房屋
    function listHouse(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!houses[tokenId].isForSale, "Already listed");

        houses[tokenId].price = price;
        houses[tokenId].isForSale = true;
        houses[tokenId].listedTimestamp = block.timestamp;

        emit HouseListed(tokenId, price, msg.sender);
    }

    // 查询出售中的房屋
    function getHousesForSale() external view returns (uint256[] memory) {
        uint256 totalHouses = nextTokenId - 1;
        uint256 count = 0;
        for (uint256 i = 1; i <= totalHouses; i++) {
            if (houses[i].isForSale) {
                count++;
            }
        }
        uint256[] memory forSaleHouses = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= totalHouses; i++) {
            if (houses[i].isForSale) {
                forSaleHouses[index] = i;
                index++;
            }
        }
        return forSaleHouses;
    }

    // 查询房产主人
    function getHouseOwner(uint256 tokenId) external view returns (address) {
        return houses[tokenId].owner;
    }

    function getHousePrice(uint256 tokenId) external view returns (uint256) {
        return houses[tokenId].price / 1 ether;
    }

    // 用户使用以太币兑换 ERC20 代币
    function buyTokens() external payable {
        require(msg.value > 0, "Ether required");

        // 假设兑换比例：1 ether =  代币
        uint256 tokensToMint = msg.value;
        myToken.mint(msg.sender, tokensToMint); // 铸造并发送ERC20代币给调用者

        // 将收到的以太币转给管理员
        payable(manager).transfer(msg.value);
    }

    // 用户使用 ERC20 代币购买房屋
    function buyHouseWithTokens(uint256 tokenId) external {
        require(houses[tokenId].isForSale, "House not for sale");
        require(houses[tokenId].owner != msg.sender, "Can not buy owned house");

        address seller = ownerOf(tokenId);
        uint256 salePrice = houses[tokenId].price;

        // 需要用户有足够的 ERC20 代币支付房屋价格
        require(myToken.balanceOf(msg.sender) >= salePrice, "Not enough tokens");

        // 计算平台手续费（基于挂单时长）
        uint256 fee = (block.timestamp - houses[tokenId].listedTimestamp) / 10000 * listingFeeRate / 100 * salePrice;
        uint256 sellerProceeds = salePrice - fee;

        // 使用 ERC20 代币支付
        myToken.transferFrom(msg.sender, seller, sellerProceeds); // 代币转给卖家
        myToken.transferFrom(msg.sender, manager, fee);  // 手续费转给平台

        houses[tokenId].isForSale = false;
        _transfer(seller, msg.sender, tokenId);  // 转移房屋所有权
        houses[tokenId].owner = msg.sender;

        emit HouseSold(tokenId, salePrice, msg.sender);
    }

    // 查看用户拥有的 ERC20 代币数量
    function getUserTokenBalance() external view returns (uint256) {
        return myToken.balanceOf(msg.sender);
    }

    // 查询房产信息
    function getHouseInfo(uint256 tokenId) external view returns (House memory) {
        return houses[tokenId];
    }
}