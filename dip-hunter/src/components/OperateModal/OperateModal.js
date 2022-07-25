import { useEffect, useState, useCallback, useRef } from "react"
import ApiProxy from "../../model/ApiProxy"
import { Icon, Button, UnderlineText } from '@deri/eco-common';
import classNames from "classnames"
import './modal.scss';
import { DeriEnv, bg } from '../../web3'
import { hasParent } from '../../utils/utils'
import DeriNumberFormat from "../../utils/DeriNumberFormat";
export default function OperateMoadl({ lang, type, chain, alert, symbolInfo, info, bTokens, wallet, closeModal }) {
  const [percent, setPercent] = useState("")
  const [balance, setBalance] = useState()
  const [isShow, setIsShow] = useState(false)
  const [amount, setAmount] = useState()
  const [bToken, setBToken] = useState(bTokens[0].bTokenSymbol)
  const [depositEst, setDepositEst] = useState({})
  const [withdrawEst, setWithdrawEst] = useState({})
  const [disabled, setDisabled] = useState(true)
  const getWalletBalance = async () => {
    let res = await ApiProxy.request("getWalletBalance", { chainId: wallet.chainId, bTokenSymbol: bToken, accountAddress: wallet.account })
    setBalance(res)
  }
  const change = e => {
    const { value } = e.target
    if (value < 0 || isNaN(value)) {
      setAmount("")
    } else {
      setAmount(value)

    }
    setPercent("")
  }

  const isUnlocked = async () => {
    let res = await ApiProxy.request("isUnlocked", { chainId: wallet.chainId, bTokenSymbol: bToken, accountAddress: wallet.account })
    console.log("isUnlocked", res.isUnlocked)
    return res
  }

  const click = async () => {
    let isApproved = true
    if (type !== "WITHDRAW") {
      isApproved = await isUnlocked()
    }
    let params;
    params = type === "DEPOSIT" ?
      { includeResponse: true, write: true, subject: type.toUpperCase(), direction: type.toUpperCase(), chainId: wallet.chainId, bTokenSymbol: bToken, symbol: info.symbol, amount: amount, accountAddress: wallet.account }
      : { includeResponse: true, write: true, subject: type.toUpperCase(), direction: type.toUpperCase(), chainId: wallet.chainId, bTokenSymbol: bToken, symbol: info.symbol, volume: amount, accountAddress: wallet.account }
    if (!isApproved.isUnlocked) {
      let paramsApprove = { includeResponse: true, write: true, subject: 'APPROVE', chainId: wallet.chainId, bTokenSymbol: bToken, accountAddress: wallet.account, approved: false, direction: type.toUpperCase() }
      let approved = await ApiProxy.request("unlock", paramsApprove)
      if (approved) {
        if (approved.success) {
          alert.success(`Approve ${bToken}`, {
            timeout: 8000,
            isTransaction: true,
            transactionHash: approved.response.data.transactionHash,
            link: `${chain.viewUrl}/tx/${approved.response.data.transactionHash}`,
            title: 'Approve Executed'
          })
        } else {
          if (approved.transactionHash === "") {
            return true;
          }
          alert.error(`Transaction Failed ${approved.response.error.message}`, {
            timeout: 300000,
            isTransaction: true,
            transactionHash: approved.response.transactionHash,
            link: `${chain.viewUrl}/tx/${approved.response.transactionHash}`,
            title: 'Approve Failed'
          })
          return true;
        }
      }
      params["approved"] = approved.success
    }
    let method = type === "DEPOSIT" ? "deposit" : "withdraw"
    let res = await ApiProxy.request(method, params)
    console.log(type, res)
    if (res.success) {
      setAmount("")
      alert.success(`${type === "DEPOSIT" ? `Deposit ${bToken}` : `Withdraw ${bToken}`}`, {
        timeout: 8000,
        isTransaction: true,
        transactionHash: res.response.data.transactionHash,
        link: `${chain.viewUrl}/tx/${res.response.data.transactionHash}`,
        title: `${type === "DEPOSIT" ? "Deposit Executed" : "Withdraw Executed"}`
      })
    } else {
      if (res.response.transactionHash === "") {
        return true;
      }
      alert.error(`Transaction Failed: ${res.response.error.message}`, {
        timeout: 300000,
        isTransaction: true,
        transactionHash: res.response.transactionHash,
        link: `${chain.viewUrl}/tx/${res.response.transactionHash}`,
        title: `${type === "DEPOSIT" ? "Deposit Failed" : "Withdraw Failed"}`
      })
    }
    return true
  }
  const onBodyClick = useCallback((e) => {
    const parent = document.querySelector('.withdraw-deposit-position');
    if (e) {
      if (!hasParent(parent, e.target) && isShow) {
        closeModal()
      }
      setIsShow(true)
    }
  })

  useEffect(() => {
    if (balance || symbolInfo.volume) {
      let aBalance = type === "DEPOSIT" ? balance : symbolInfo.volume
      if (percent && aBalance) {
        let per = percent
        if (percent === "MAX") {
          per = 1
        } else {
          per = parseInt(per) / 100
        }
        let amount = bg(aBalance).times(per).toString()
        setAmount(amount)
      }
    }

  }, [percent, balance])

  useEffect(() => {
    if (wallet.isConnected()) {
      getWalletBalance()
    }
  }, [wallet])

  useEffect(async () => {
    if (balance || symbolInfo.volume) {
      let aBalance = type === "DEPOSIT" ? balance : symbolInfo.volume
      if (+amount) {
        if (+amount > +aBalance) {
          setDisabled(true)
        } else {
          setDisabled(false)
        }
        if (type === "DEPOSIT") {
          let res = await ApiProxy.request("getEstimatedDepositeInfo", { chainId: wallet.chainId, accountAddress: wallet.account, symbol: info.symbol, newAmount: amount })
          console.log("getEstimatedDepositeInfo", res)
          setDepositEst(res)
        } else {
          let res = await ApiProxy.request("getEstimatedWithdrawInfo", { chainId: wallet.chainId, accountAddress: wallet.account, symbol: info.symbol, newVolume: amount })
          console.log("getEstimatedWithdrawInfo", res)
          if (bToken === info.unit) {
            res.amount = bg(res.amount).div(bg(symbolInfo.indexPrice)).toString()
          }
          setWithdrawEst(res)
        }
      }
    }

  }, [amount, balance, bToken])

  return (
    <div className={classNames('withdraw-deposit-position', type)}>
      <div className='font-box'>
        <div className='font-text'>
          {type}
        </div>

      </div>
      <div className="modal-info">
        {type === "POSITION" && <div className="position-modal-info">
          <div className="position-modal-info-top">
            <div className="position-modal-info-col">
              <div className="info-col-title">
                {lang["my-position"]}
              </div>
              <div className="info-col-num">
                <DeriNumberFormat value={symbolInfo.volume} /> {info.unit} {lang["options"]}
              </div>
            </div>
            <div className="position-modal-info-col">
              <div className="info-col-title">
                {lang["my-deposit"]}
              </div>
              <div className="info-col-num">
                $<DeriNumberFormat value={symbolInfo.margin} decimalScale={2} />
              </div>
            </div>
            <div className="position-modal-info-col">
              <div className="info-col-title">
                {lang["accumulated-income"]}
              </div>
              <div className="info-col-num">
                $<DeriNumberFormat value={symbolInfo.funding} decimalScale={2} />
              </div>
            </div>
            <div className="position-modal-info-col">
              <div className="info-col-title">
                {lang["daily-income"]}
              </div>
              <div className="info-col-num">
                $<DeriNumberFormat value={symbolInfo.pnlPerDay} decimalScale={2} />/{lang["day"]}
              </div>
            </div>
          </div>
          <div className='value-strategy'>
            <div className="value-strategy-title">
              {lang["value-strategy"]}
            </div>
            <div className="value-strategy-des">
              The vault earns yield on its {bTokens[0].bTokenSymbol} deposits by selling cash covered {info.symbolDisplay} directly to market makers on Deri Protocol.
            </div>
          </div>
        </div>}
        {type === "DEPOSIT" && <div className="deposit-modal-info">
          <div className="deposit-withdraw-input">
            <div className="balance-position">
              {lang["wallet-balance"]}: <DeriNumberFormat value={balance} decimalScale={2} />
            </div>
            <div className="input-box">
              <div className="input-token">
                <input value={amount} onChange={change} />
                <div className='baseToken'>
                  <Icon token={bToken} width="22" height="22" />  {bToken}
                </div>
              </div>
              <div className="button-group">
                <div className={classNames("percent", { "selected": percent === "25%" })} onClick={() => { setPercent("25%") }}>25%</div>
                <div className={classNames("percent", { "selected": percent === "50%" })} onClick={() => { setPercent("50%") }}>50%</div>
                <div className={classNames("percent", { "selected": percent === "75%" })} onClick={() => { setPercent("75%") }}>75%</div>
                <div className={classNames("percent", { "selected": percent === "MAX" })} onClick={() => { setPercent("MAX") }}>MAX</div>
              </div>
            </div>
          </div>
          <div className="hr">

          </div>
          <div className="change-box">
            {+amount > 0 && <>
              <div className="deposit-withdraw-modal-info-col">
                <div className="deposit-withdraw-modal-info-col-title">
                  {lang["position-after-deposit"]}
                </div>
                <div className="deposit-withdraw-modal-info-col-num">
                  <DeriNumberFormat value={depositEst.volume} decimalScale={4} /> {info.unit}
                </div>
              </div>
              <div className="deposit-withdraw-modal-info-col">
                <div className="deposit-withdraw-modal-info-col-title">
                  {lang["transaction-fee"]}
                </div>
                <div className="deposit-withdraw-modal-info-col-num">
                  $<DeriNumberFormat value={depositEst.fee} decimalScale={2} />
                </div>
              </div>
            </>}
          </div>
          <div className="deposit-withdraw-btn">
            <Button disabled={disabled} onClick={click} label={`${lang["deposit"]}  ${bToken}`} width={375} height={56} hoverBgColor="#38CB89" radius={14} bgColor="#EEFAF3" fontColor="#38CB89" borderSize="0" />
          </div>
        </div>}
        {type === "WITHDRAW" && <div className="deposit-modal-info">
          <div className="change-box withdraw-top-info">
            <div className="deposit-withdraw-modal-info-col">
              <div className="deposit-withdraw-modal-info-col-title">
                {lang["current"]} {info.unit} {lang["price"]}
              </div>
              <div className="deposit-withdraw-modal-info-col-num">
                $<DeriNumberFormat value={symbolInfo.indexPrice} decimalScale={2} />
              </div>
            </div>
            <div className="deposit-withdraw-modal-info-col">
              <div className="deposit-withdraw-modal-info-col-title">
                {lang["current-withdraw-type"]}
                <UnderlineText width="220" tip={`The token you will receive when withdrawing funds. If ${info.unit} is selected, Dip Hunter will help to by ${info.unit} on Pancakeswap and send it to you.`}>
                  <Icon token="wring" />
                </UnderlineText>
              </div>
              <div className="deposit-withdraw-modal-info-col-num">
                <div onClick={() => { setBToken(bTokens[0].bTokenSymbol) }} className={`withdraw-busd-eth-btc  ${bToken !== info.unit ? "check-token" : ""}  `}>
                  <div className="is-check" >
                    {bToken !== info.unit && <Icon token="check-btoken" />}
                  </div> {bTokens[0].bTokenSymbol}
                </div>
                <div onClick={() => { setBToken(info.unit) }} className={`withdraw-busd-eth-btc  ${bToken === info.unit ? "check-token" : ""}  `}>
                  <div className="is-check" >
                    {bToken === info.unit && <Icon token="check-btoken" />}
                  </div>
                  {info.unit}
                </div>
              </div>
            </div>
          </div>
          <div className="deposit-withdraw-input">
            <div className="balance-position">
              {lang["current-position"]}: <DeriNumberFormat value={symbolInfo.volume} />
            </div>
            <div className="input-box">
              <div className="input-token">
                <input value={amount} onChange={change} />
                <div className='baseToken'>
                  <Icon token={info.unit} width="22" height="22" /> {info.unit} Options
                </div>
              </div>
              <div className="button-group">
                <div className={classNames("percent", { "selected": percent === "25%" })} onClick={() => { setPercent("25%") }}>25%</div>
                <div className={classNames("percent", { "selected": percent === "50%" })} onClick={() => { setPercent("50%") }}>50%</div>
                <div className={classNames("percent", { "selected": percent === "75%" })} onClick={() => { setPercent("75%") }}>75%</div>
                <div className={classNames("percent", { "selected": percent === "MAX" })} onClick={() => { setPercent("MAX") }}>MAX</div>
              </div>
            </div>
          </div>
          <div className="hr">

          </div>
          <div className="change-box">
            {+amount > 0 && <>
              <div className="deposit-withdraw-modal-info-col">
                <div className="deposit-withdraw-modal-info-col-title">
                  {lang["withdraw-amount"]}
                </div>
                <div className="deposit-withdraw-modal-info-col-num">
                  <DeriNumberFormat value={withdrawEst.amount} decimalScale={2} /> {bToken}
                </div>
              </div>
              <div className="deposit-withdraw-modal-info-col">
                <div className="deposit-withdraw-modal-info-col-title">
                  {lang["position-after-withdraw"]}
                </div>
                <div className="deposit-withdraw-modal-info-col-num">
                  <DeriNumberFormat value={withdrawEst.volume} /> {info.unit}
                </div>
              </div>
              <div className="deposit-withdraw-modal-info-col">
                <div className="deposit-withdraw-modal-info-col-title">
                  {lang["transaction-fee"]}
                </div>
                <div className="deposit-withdraw-modal-info-col-num">
                  $<DeriNumberFormat value={withdrawEst.fee} decimalScale={2} />
                </div>
              </div>
            </>}
          </div>
          <div className="deposit-withdraw-btn">
            <Button disabled={disabled} label={`${lang["withdraw"]} ${bToken}`} onClick={click} width={375} height={56} hoverBgColor="#38CB89" radius={14} bgColor="#EEFAF3" fontColor="#38CB89" borderSize="0" />
          </div>
        </div>}
      </div>
      <div className="close-modal" onClick={() => { closeModal() }}>
        <Icon token="close-modal" />
      </div>
    </div>
  )
}