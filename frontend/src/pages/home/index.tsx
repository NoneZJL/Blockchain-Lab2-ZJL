import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import Web3 from 'web3';
import { BuyMyRoomContract } from '../../utils/contracts'; // 确保这个文件导出你的合约实例

const HomePage: React.FC = () => {
    const [account, setAccount] = useState<string | null>(null); // 存储用户的以太坊账户
    const [isConnecting, setIsConnecting] = useState<boolean>(false); // 连接钱包时的状态
    const [isAirdropping, setIsAirdropping] = useState<boolean>(false); // 空投状态
    const [userHouses, setUserHouses] = useState<number[]>([]); // 用于存储用户房子信息
    const [isFetchingHouses, setIsFetchingHouses] = useState<boolean>(false); // 查询房子时的加载状态

    useEffect(() => {
        // 初始化检查用户是否已经连接钱包
        const initCheckAccounts = async () => {
            // @ts-ignore
            const { ethereum } = window;
            if (ethereum && ethereum.isMetaMask) {
                // 尝试获取已经连接的用户账户
                const accounts = await ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    setAccount(accounts[0]);
                }
            }
        };

        initCheckAccounts();
    }, []);

    // 连接钱包功能
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

    // 空投 3 个房子
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

    // 查询用户拥有的房子
    const checkUserHouses = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }

        setIsFetchingHouses(true);
        try {
            // 调用合约方法获取房屋数据
            const houses = await BuyMyRoomContract.methods.getUserHouses(account).call();
            console.log('获取的房子数据:', houses); // 打印返回的房子数据

            // 如果 houses 存在且是数组，则进行 map 操作
            if (Array.isArray(houses)) {
                const houseIds = houses.map((house: any) => Number(house));
                setUserHouses(houseIds);
            } else {
                // 如果 houses 不是数组，则提示错误
                message.error('未能正确获取房子数据');
            }
        } catch (error: any) {
            message.error(`获取房子失败: ${error.message}`);
        } finally {
            setIsFetchingHouses(false); // 结束加载状态
        }
    };




    return (
        <div className="container">
            <div className="main">
                <h1>欢迎来到主页</h1>
                <div className="account">
                    {account ? (
                        <div>当前用户：{account}</div>
                    ) : (
                        <Button onClick={connectWallet} loading={isConnecting}>
                            {isConnecting ? '连接中...' : '连接钱包'}
                        </Button>
                    )}
                </div>
                {account && (
                    <>
                        <Button onClick={airdropHouses} disabled={isAirdropping}>
                            {isAirdropping ? '领取中...' : '领取 3 个房子'}
                        </Button>
                        <Button onClick={checkUserHouses} disabled={isFetchingHouses}>
                            {isFetchingHouses ? '查询中...' : '查看我的房子'}
                        </Button>
                    </>
                )}
                {userHouses.length > 0 && (
                    <div>
                        <h2>我的房子:</h2>
                        <ul>
                            {userHouses.map(house => (
                                <li key={house}>房子 ID: {house}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
