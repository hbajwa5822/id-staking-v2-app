import React, { useMemo } from "react";
import { StakeModal, DataLine } from "./StakeModal";
import { DisplayAddressOrENS, DisplayDuration, formatAmount, formatDate } from "@/utils/helpers";
import { StakeData } from "@/utils/stakeHistory";
import { parseEther } from "viem";
import { useStakeTxWithApprovalCheck } from "@/hooks/hooks_staking/useStakeTxWithApprovalCheck";

const useSelfStakeTx = ({
  address,
  inputValue,
  lockedPeriodSeconds,
  onConfirm,
}: {
  address: `0x${string}`;
  inputValue: string;
  lockedPeriodSeconds: bigint;
  onConfirm: () => void;
}) => {
  const valueToStake = parseEther(inputValue);

  const [functionName, functionArgs] = useMemo(() => {
    let functionName = "extendSelfStake";
    const args = [lockedPeriodSeconds];
    if (valueToStake > 0n) {
      functionName = "selfStake";
      args.unshift(valueToStake);
    }
    return [functionName, args];
  }, [valueToStake, lockedPeriodSeconds]);

  return useStakeTxWithApprovalCheck({
    address,
    requiredApprovalAmount: valueToStake,
    functionName,
    functionArgs,
    onConfirm,
  });
};

const UpdateModalDataLine = ({
  label,
  children,
  emphasis,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) => (
  <div className={`flex justify-between py-2 ${emphasis ? "font-bold" : "text-color-2"}`}>
    <span className={emphasis ? "text-color-6" : "text-inherit"}>{label}</span>
    <div>{children}</div>
  </div>
);

const SelfStakeModalBody = ({
  address,
  inputValue,
  lockedPeriodMonths,
  lockedPeriodSeconds,
  stakeToUpdate,
}: {
  address: `0x${string}`;
  inputValue: string;
  lockedPeriodMonths: number;
  lockedPeriodSeconds: number;
  stakeToUpdate?: StakeData;
}) => {
  if (stakeToUpdate) {
    const oldAmount = formatAmount(stakeToUpdate.amount);
    const newAmount = parseFloat(inputValue) >= 0 ? inputValue : "0";
    const total = formatAmount((parseEther(inputValue) + BigInt(stakeToUpdate.amount)).toString());

    const oldUnlockDate = new Date(stakeToUpdate.unlock_time);

    const newUnlockDate = new Date(Date.now() + lockedPeriodSeconds * 1000);

    return (
      <div>
        <UpdateModalDataLine label="Address">
          <DisplayAddressOrENS user={address} max={20} />
        </UpdateModalDataLine>
        <hr className="border-foreground-4" />
        <UpdateModalDataLine label="Old amount">{oldAmount} GTC</UpdateModalDataLine>
        <hr className="border-foreground-4" />
        <UpdateModalDataLine label="New amount" emphasis>
          +{newAmount} GTC
        </UpdateModalDataLine>
        <hr className="border-foreground-4" />
        <UpdateModalDataLine label="Total" emphasis>
          {total} GTC
        </UpdateModalDataLine>
        <hr className="border-foreground-4" />
        <UpdateModalDataLine label="Old unlock date">{formatDate(oldUnlockDate)}</UpdateModalDataLine>
        <hr className="border-foreground-4" />
        <UpdateModalDataLine label="New lockup period" emphasis>
          <DisplayDuration seconds={lockedPeriodSeconds} />
        </UpdateModalDataLine>
        <hr className="border-foreground-4" />
        <UpdateModalDataLine label="New unlock date">{formatDate(newUnlockDate)}</UpdateModalDataLine>
      </div>
    );
  }
  return (
    <div>
      <DataLine label="Address" value={<DisplayAddressOrENS user={address} max={20} />} />
      <hr className="border-foreground-4" />
      <DataLine label="Amount" value={`${inputValue} GTC`} />
      <hr className="border-foreground-4" />
      <DataLine label="Lockup" value={<div>{lockedPeriodMonths} months</div>} />
    </div>
  );
};

export const SelfStakeModal = ({
  address,
  inputValue,
  lockedPeriodMonths,
  stakeToUpdate,
  isOpen,
  onClose,
}: {
  address: `0x${string}`;
  inputValue: string;
  lockedPeriodMonths: number;
  isOpen: boolean;
  onClose: () => void;
  stakeToUpdate?: StakeData;
}) => {
  const lockedPeriodSeconds = BigInt(lockedPeriodMonths) * 30n * 24n * 60n * 60n;

  const { stake, isLoading } = useSelfStakeTx({
    address,
    inputValue,
    lockedPeriodSeconds,
    onConfirm: onClose,
  });

  return (
    <StakeModal
      title={stakeToUpdate ? "Update self stake" : "Stake on yourself"}
      buttonText={stakeToUpdate ? "Update stake" : "Stake"}
      onButtonClick={stake}
      buttonLoading={isLoading}
      isOpen={isOpen}
      onClose={onClose}
    >
      <SelfStakeModalBody
        address={address}
        inputValue={inputValue}
        lockedPeriodMonths={lockedPeriodMonths}
        lockedPeriodSeconds={Number(lockedPeriodSeconds)}
        stakeToUpdate={stakeToUpdate}
      />
    </StakeModal>
  );
};