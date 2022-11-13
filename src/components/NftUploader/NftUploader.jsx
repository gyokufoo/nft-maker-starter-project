import { Button } from "@mui/material";
import React from "react";
import ImageLogo from "./image.svg";
import "./NftUploader.css";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Web3Mint from "../../utils/Web3Mint.json";
import Arweave from "arweave";
import { Buffer } from "buffer";

const NftUploader = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  console.log({ currentAccount });

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log("Make sure you have MetaMask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }
    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
    } else {
      console.log("No authorized account found");
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected: ", accounts);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const askContractToMintNFT = async (ardrive) => {
    const CONTRACT_ADDRESS = "0x9B9b6256c76Dc7C0F235e4748BFDC866f3895a94";
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          Web3Mint.abi,
          signer
        );
        console.log("Going to pop wallet now to pay gas...");

        let nftTxn = await connectedContract.mintIpfsNFT("arweave", ardrive);
        console.log("Mining...please wait.");
        await nftTxn.wait();

        console.log(
          `Mined, see transaction: https://goerli.etherscan.io/tx/${nftTxn.hash}`
        );
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const imageToNFT = async (e) => {
    // #1 Get image and convert to buffer
    const image = e.target.files[0];
    console.log(image);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64Text = event.currentTarget.result;
      console.log(base64Text);
      const base64ImgString = base64Text
        .replace("data:", "")
        .replace(/^.+,/, "");
      console.log(base64ImgString);
      const buf = Buffer.from(base64ImgString, "base64");
      console.log(buf);

      // #2 Make a connection to Arweave server; following standard example.
      const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
      });

      // #3 Load our key from the .env file
      const arweaveKey = JSON.parse(process.env.REACT_APP_ARWEAVE_KEY);
      console.log({ arweaveKey });

      // #4 Check out wallet balance. We should probably fail if too low?
      const arweaveWallet = await arweave.wallets.jwkToAddress(arweaveKey);
      const arweaveWalletBallance = await arweave.wallets.getBalance(
        arweaveWallet
      );

      console.log({ arweaveWalletBallance });

      // #5 Core flow: create a transaction, upload and wait for the status!
      let transaction = await arweave.createTransaction(
        { data: buf },
        arweaveKey
      );

      transaction.addTag("Content-Type", "image/png");
      console.log(transaction);
      await arweave.transactions.sign(transaction, arweaveKey);
      const response = await arweave.transactions.post(transaction);
      const status = await arweave.transactions.getStatus(transaction.id);
      const arweaveImgURL = `https://www.arweave.net/${transaction.id}?ext=png`;
      console.log(response);
      console.log(status);
      console.log(arweaveImgURL);

      askContractToMintNFT(arweaveImgURL);
    };
    reader.readAsDataURL(image);
  };

  const renderNotConnectedContainer = () => (
    <button
      onClick={connectWallet}
      className="cta-button connect-wallet-button"
    >
      Connect to Wallet
    </button>
  );

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className="outerBox">
      {currentAccount === "" ? (
        renderNotConnectedContainer()
      ) : (
        <p>If you choose image, you can mint your NFT</p>
      )}
      <div className="title">
        <h2>NFTアップローダー</h2>
        <p>JpegかPngの画像ファイル</p>
      </div>
      <div className="nftUplodeBox">
        <div className="imageLogoAndText">
          <img src={ImageLogo} alt="imagelogo" />
          <p>ここにドラッグ＆ドロップしてね</p>
        </div>
        <input
          className="nftUploadInput"
          multiple
          name="imageURL"
          type="file"
          accept=".jpg , .jpeg , .png"
          onChange={imageToNFT}
        />
      </div>
      <p>または</p>
      <Button variant="contained">
        ファイルを選択
        <input
          className="nftUploadInput"
          type="file"
          accept=".jpg , .jpeg , .png"
          onChange={imageToNFT}
        />
      </Button>
    </div>
  );
};

export default NftUploader;
