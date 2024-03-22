import { useCallback, useMemo, useState } from "react";
import IdentityStakingAbi from "../../abi/IdentityStaking.json";
import ERC20 from "../../abi/ERC20.json";
import { useReadContract } from "wagmi";
import { useConnectedChain } from "@/utils/helpers";
import { onTxError, onTxReceiptError, useStakeTxHandler } from "@/hooks/hooks_staking/useStakeTxHandler";
import { useStakeHistoryQueryKey } from "@/utils/stakeHistory";
import { useToast } from "@chakra-ui/react";
import { wagmiConfig } from "@/utils/chains";
import { waitForTransactionReceipt, writeContract } from "@wagmi/core";

export const useStakeTxWithApprovalCheck = ({ address }: { address: `0x${string}` }) => {
  const toast = useToast();
  const queryKey = useStakeHistoryQueryKey(address);
  const connectedChain = useConnectedChain();

  const [approvalIsLoading, setApprovalIsLoading] = useState(false);

  const {
    isLoading: allowanceCheckIsLoading,
    isSuccess: allowanceCheckIsSuccess,
    data: allowance,
  } = useReadContract({
    abi: ERC20,
    address: connectedChain.gtcContractAddr,
    functionName: "allowance",
    chainId: connectedChain.id,
    args: [address, connectedChain.stakingContractAddr],
  });

  const {
    isLoading: stakeIsLoading,
    writeContract: stakeWriteContract,
    isConfirmed,
  } = useStakeTxHandler({
    queryKey,
    txTitle: "Stake",
  });

  const submitStakeTx = useCallback(
    (functionName: string, args: any[]) => {
      stakeWriteContract({
        address: connectedChain.stakingContractAddr,
        abi: IdentityStakingAbi,
        chainId: connectedChain.id,
        functionName,
        args,
      });
    },
    [stakeWriteContract, connectedChain]
  );

  const stake = useCallback(
    async ({
      functionName,
      functionArgs,
      requiredApprovalAmount,
    }: {
      functionName: string;
      functionArgs: any[];
      requiredApprovalAmount: bigint;
    }) => {
      const isSpendingApproved = allowanceCheckIsSuccess && (allowance as bigint) >= requiredApprovalAmount;

      if (!isSpendingApproved) {
        setApprovalIsLoading(true);
        let hash;
        try {
          hash = await writeContract(wagmiConfig, {
            address: connectedChain.gtcContractAddr,
            abi: ERC20,
            functionName: "approve",
            chainId: connectedChain.id as (typeof wagmiConfig)["chains"][number]["id"],
            args: [connectedChain.stakingContractAddr, requiredApprovalAmount],
          });
        } catch (e) {
          onTxError("Spending approval", e, toast);
        }
        setApprovalIsLoading(false);

        if (hash) {
          try {
            await waitForTransactionReceipt(wagmiConfig, {
              hash,
              chainId: connectedChain.id as (typeof wagmiConfig)["chains"][number]["id"],
            });
            submitStakeTx(functionName, functionArgs);
          } catch (e) {
            onTxReceiptError("Spending approval", hash, e, toast, connectedChain);
          }
        }
      } else {
        submitStakeTx(functionName, functionArgs);
      }
    },
    [submitStakeTx, allowanceCheckIsSuccess, allowance]
  );

  const isLoading = allowanceCheckIsLoading || approvalIsLoading || stakeIsLoading;

  return useMemo(() => ({ stake, isLoading, isConfirmed }), [stake, isLoading]);
};
