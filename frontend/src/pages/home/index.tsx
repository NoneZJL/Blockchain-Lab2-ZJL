import React, { useState, useEffect } from 'react';
import { Button, message, Modal, Input, List, Row, Col, Card, Space } from 'antd';
import Web3 from 'web3';
import { BuyMyRoomContract, myERC20Contract } from '../../utils/contracts';
import Addresses from '../../utils/contract-addresses.json'
import './index.css';
import {type} from "node:os";

const HomePage: React.FC = () => {
    const [account, setAccount] = useState<string | null>(null); // 存储用户的以太坊账户
    const [isConnecting, setIsConnecting] = useState<boolean>(false); // 连接钱包时的状态
    const [isAirdropping, setIsAirdropping] = useState<boolean>(false); // 空投状态
    const [userHouses, setUserHouses] = useState<number[]>([]); // 用于存储用户房子信息
    const [isFetchingHouses, setIsFetchingHouses] = useState<boolean>(false); // 查询房子时的加载状态
    const [isExchanging, setIsExchanging] = useState<boolean>(false); // 用于以太币兑换ERC20状态
    const [erc20Balance, setErc20Balance] = useState<number>(0); // 用户的ERC20代币余额
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false); // 控制弹窗显示
    const [exchangeAmount, setExchangeAmount] = useState<string>(''); // 用户输入的兑换金额
    const [isListing, setIsListing] = useState<boolean>(false); // 挂出房子状态
    const [listHouseId, setListHouseId] = useState<string>(''); // 用户输入的房子ID
    const [listHousePrice, setListHousePrice] = useState<string>(''); // 用户输入的房子价格
    const [forSaleHouses, setForSaleHouses] = useState<number[]>([]); // 所有挂出的房子
    const [isFetchingForSale, setIsFetchingForSale] = useState<boolean>(false); // 查询所有挂出房子的加载状态
    const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null); // 被选中的房子ID
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState<boolean>(false); // 控制购买确认提示
    const [houseInfo, setHouseInfo] = useState<any>(null); // 存储房屋信息
    const [isHouseInfoModalVisible, setIsHouseInfoModalVisible] = useState<boolean>(false); // 控制房屋信息弹窗

    useEffect(() => {
        const initCheckAccounts = async () => {
            // @ts-ignore
            const { ethereum } = window;
            if (ethereum && ethereum.isMetaMask) {
                const accounts = await ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    setAccount(accounts[0]);
                }
            }
        };

        initCheckAccounts();
    }, []);

    const connectWallet = async () => {
        try {
            setIsConnecting(true);
            // @ts-ignore
            const { ethereum } = window;
            if (!ethereum || !ethereum.isMetaMask) {
                message.error('请安装 MetaMask 钱包');
                return;
            }
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                setAccount(accounts[0]);
                message.success(`已连接账户: ${accounts[0]}`);
            } else {
                message.error('连接钱包失败');
            }
        } catch (error: any) {
            message.error(`连接钱包失败: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const listHouse = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        if (!listHouseId || isNaN(Number(listHouseId)) || !listHousePrice || isNaN(Number(listHousePrice))) {
            message.error('请输入有效的房子ID和价格');
            return;
        }
        setIsListing(true);
        try {
            await BuyMyRoomContract.methods.listHouse(Number(listHouseId), Web3.utils.toWei(listHousePrice, 'ether')).send({ from: account });
            message.success('成功挂出房子');
        } catch (error: any) {
            message.error(`挂出房子失败: ${error.message}`);
        } finally {
            setIsListing(false);
        }
    };

    const getHousesForSale = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }

        setIsFetchingForSale(true);
        try {
            // 通过类型断言确保返回值是数组
            const houses = await BuyMyRoomContract.methods.getHousesForSale().call() as number[];
            const parsedHouses = houses.map((house: any) => Number(house));
            setForSaleHouses(parsedHouses);
        } catch (error: any) {
            message.error(`查询挂出房子失败: ${error.message}`);
        } finally {
            setIsFetchingForSale(false);
        }
    };



    const getHouseOwner = async (houseId: number) => {
        try {
            const owner = await BuyMyRoomContract.methods.getHouseOwner(houseId).call();
            message.success(`房子 ${houseId} 的主人是：${owner}`);
        } catch (error: any) {
            message.error(`查询房子主人失败: ${error.message}`);
        }
    };

    const confirmPurchase = (houseId: number) => {
        setSelectedHouseId(houseId);
        setIsConfirmModalVisible(true);
    };

    const handlePurchase = async () => {
        if (selectedHouseId !== null && account) {
            try {
                // 获取所需的房屋价格
                // const housePrice = await BuyMyRoomContract.methods.getHousePrice(selectedHouseId).call();

                console.log(`Attempting to purchase house ${selectedHouseId} from account ${account}`);
                if (BuyMyRoomContract && myERC20Contract) {
                    try {
                        await myERC20Contract.methods.approve(Addresses.BuyMyRoom, houseInfo.price).send({
                            from: account
                        })
                        // 调用购买房屋的函数
                        await BuyMyRoomContract.methods
                            .buyHouseWithTokens(selectedHouseId)
                            .send({ from: account });

                        message.success(`成功购买房子 ${selectedHouseId}`);
                        setIsConfirmModalVisible(false);
                        getHousesForSale();
                    } catch (error: any) {
                        alert(error.message)
                    }
                }
            } catch (error: unknown) {
                const errorMessage = (error as any).message || (error as Error).message; // 捕捉不同类型的错误
                console.error(error);
                message.error(`购买房子失败: ${errorMessage}`);
            }
        } else {
            message.error('请确保选择了房子并且已连接账户');
        }
    };



    const airdropHouses = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }

        setIsAirdropping(true);
        try {
            await BuyMyRoomContract.methods.airdropHouses().send({ from: account });
            message.success('成功领取 3 个房子');
        } catch (error: any) {
            message.error(`领取失败: ${error.message}`);
        } finally {
            setIsAirdropping(false);
        }
    };

    const checkUserHouses = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }

        setIsFetchingHouses(true);
        try {
            const houses = await BuyMyRoomContract.methods.getUserHouses(account).call();
            console.log('获取的房子数据:', houses);
            if (Array.isArray(houses)) {
                const houseIds = houses.map((house: any) => Number(house));
                setUserHouses(houseIds);
            } else {
                message.error('未能正确获取房子数据');
            }
        } catch (error: any) {
            message.error(`获取房子失败: ${error.message}`);
        } finally {
            setIsFetchingHouses(false);
        }
    };

    // 打开兑换代币的弹窗
    const openExchangeModal = () => {
        setIsModalVisible(true);
    };

    // 关闭弹窗
    const handleCancel = () => {
        setIsModalVisible(false);
    };

    // 处理表单输入变化
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setExchangeAmount(e.target.value);
    };

    // 提交兑换
    const handleExchange = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }

        if (!exchangeAmount || isNaN(Number(exchangeAmount)) || Number(exchangeAmount) <= 0) {
            message.error('请输入有效的金额');
            return;
        }

        setIsExchanging(true);
        try {
            // 根据用户输入的金额进行兑换
            await BuyMyRoomContract.methods.buyTokens().send({
                from: account,
                value: Web3.utils.toWei(exchangeAmount, 'ether'),
            });
            message.success('兑换成功');
            setIsModalVisible(false); // 关闭弹窗
        } catch (error: any) {
            message.error(`兑换失败: ${error.message}`);
        } finally {
            setIsExchanging(false);
        }
    };

    const checkTokenBalance = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }

        try {
            const balance = await BuyMyRoomContract.methods.getUserTokenBalance().call({ from: account });
            const balanceInEther = Number(balance) / 1e18;
            setErc20Balance(balanceInEther);
        } catch (error: any) {
            message.error(`查询代币余额失败: ${error.message}`);
        }
    };

    // 查看房屋信息
    const getHouseInfo = async (houseId: number) => {
        try {
            const houseDetails = await BuyMyRoomContract.methods.getHouseInfo(houseId).call();
            setHouseInfo(houseDetails);
            setIsHouseInfoModalVisible(true); // 显示房屋信息弹窗
        } catch (error: any) {
            message.error(`查询房屋信息失败: ${error.message}`);
        }
    };

    return (
        <div className="container">
            <div className="main">
                <h1>欢迎来到房屋交易平台</h1>

                {/* 显示账户信息 */}
                <div className="account-info">
                    {account ? (
                        <div className="account-address">当前用户：{account}</div>
                    ) : (
                        <Button type="primary" onClick={connectWallet} loading={isConnecting}>
                            {isConnecting ? '连接中...' : '连接钱包'}
                        </Button>
                    )}
                </div>

                {account && (
                    <div className="user-actions">
                        <Row gutter={[16, 16]}>
                            <Col>
                                <Button onClick={airdropHouses} disabled={isAirdropping} type="primary">
                                    {isAirdropping ? '领取中...' : '领取 3 个房子'}
                                </Button>
                            </Col>
                            <Col>
                                <Button onClick={checkUserHouses} disabled={isFetchingHouses} type="primary">
                                    {isFetchingHouses ? '查询中...' : '查看我的房子'}
                                </Button>
                            </Col>
                            <Col>
                                <Button onClick={openExchangeModal} type="primary">兑换 ERC20 代币</Button>
                            </Col>
                            <Col>
                                <Button onClick={checkTokenBalance} type="primary">查询我的 ERC20 代币余额</Button>
                            </Col>
                        </Row>
                        {erc20Balance > 0 && <div className="erc20-balance">我的 ERC20 代币余额: {erc20Balance}</div>}
                    </div>
                )}

                {/* 挂出房子的表单 */}
                <Card title="挂出房子" bordered={false} className="house-listing-card">
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Input placeholder="房子ID" value={listHouseId} onChange={(e) => setListHouseId(e.target.value)} />
                        </Col>
                        <Col span={8}>
                            <Input placeholder="挂出价格 (ERC20代币)" value={listHousePrice} onChange={(e) => setListHousePrice(e.target.value)} />
                        </Col>
                        <Col span={8}>
                            <Button onClick={listHouse} disabled={isListing} type="primary" block>
                                {isListing ? '挂出中...' : '挂出房子'}
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* 查询挂出的房子 */}
                <Card title="查看所有挂出的房子" bordered={false} className="for-sale-houses-card">
                    <Button onClick={getHousesForSale} disabled={isFetchingForSale} type="primary">
                        {isFetchingForSale ? '查询中...' : '查看所有挂出的房子'}
                    </Button>

                    <List
                        grid={{ gutter: 16, column: 3 }}
                        dataSource={forSaleHouses}
                        renderItem={(houseId: number) => (
                            <List.Item key={houseId}>
                                <Card>
                                    房子 ID: {houseId}
                                    <Space direction="vertical" style={{ marginTop: 16 }}>
                                        <Button onClick={() => getHouseOwner(houseId)} block>查看房主</Button>
                                        <Button onClick={() => confirmPurchase(houseId)} block type="primary">购买房子</Button>
                                        <Button onClick={() => getHouseInfo(houseId)} block>查看房屋信息</Button>
                                    </Space>
                                </Card>
                            </List.Item>
                        )}
                    />
                </Card>

                {/* 我的房子 */}
                {userHouses.length > 0 && (
                    <Card title="我的房子" bordered={false} className="user-houses-card">
                        <List
                            dataSource={userHouses}
                            renderItem={(house: number) => <List.Item>房子 ID: {house}</List.Item>}
                        />
                    </Card>
                )}

                {/* 弹窗 */}
                <Modal title="兑换 ERC20 代币" visible={isModalVisible} onOk={handleExchange} onCancel={handleCancel} confirmLoading={isExchanging}>
                    <Input placeholder="请输入以太币金额" value={exchangeAmount} onChange={handleInputChange} />
                </Modal>

                <Modal title="房屋信息" visible={isHouseInfoModalVisible} onCancel={() => setIsHouseInfoModalVisible(false)} footer={null}>
                    {houseInfo ? (
                        <div>
                            <p>房子价格: {Web3.utils.fromWei(houseInfo.price, 'ether')} ERC20代币</p>
                        </div>
                    ) : (
                        <p>正在加载房屋信息...</p>
                    )}
                </Modal>

                <Modal title="确认购买" visible={isConfirmModalVisible} onOk={handlePurchase} onCancel={() => setIsConfirmModalVisible(false)} okText="确认购买" cancelText="取消">
                    <p>你确定要购买房子 ID: {selectedHouseId} 吗？</p>
                </Modal>
            </div>
        </div>
    );
};

export default HomePage;
