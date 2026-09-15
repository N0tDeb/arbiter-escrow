// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEscrowReceiverTarget {
    function approveRelease() external;
    function withdraw() external;
}

/// @dev Test helper that refuses incoming ETH so withdrawal failure handling can be verified.
contract RevertingReceiver {
    IEscrowReceiverTarget public escrow;

    function setEscrow(address _escrow) external {
        escrow = IEscrowReceiverTarget(_escrow);
    }

    function approveRelease() external {
        escrow.approveRelease();
    }

    function withdrawPayout() external {
        escrow.withdraw();
    }

    receive() external payable {
        revert("Receiver rejects ETH");
    }
}

/// @dev Test helper that attempts to call withdraw() recursively while receiving its payout.
contract ReentrantReceiver {
    IEscrowReceiverTarget public escrow;
    bool public reentrySucceeded;
    uint256 public receiveCount;

    function setEscrow(address _escrow) external {
        escrow = IEscrowReceiverTarget(_escrow);
    }

    function approveRelease() external {
        escrow.approveRelease();
    }

    function withdrawPayout() external {
        escrow.withdraw();
    }

    receive() external payable {
        receiveCount += 1;
        (bool ok,) = address(escrow).call(abi.encodeWithSignature("withdraw()"));
        reentrySucceeded = ok;
    }
}
