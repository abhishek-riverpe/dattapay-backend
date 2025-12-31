import type { RequestHandler } from "express";
import express from "express";
import transferController from "../controllers/transfer.controller";

const router = express.Router();

// [POST] /api/transfer/simulate Request:{externalAccountId, exactAmountIn, exactAmountOut, depositMemo}, Response:{executionId, payloadToSign}
router.post("/simulate", transferController.simulateTransfer as RequestHandler);

// [POST] /api/wallet/transfer Request:{executionId, signature}, Response:{message}
router.post("/transfer", transferController.transfer as RequestHandler);

export default router;

/**
 * Zynk Transfer API
 * {{base_url}}
/api/v1/transformer/transaction/simulate
{
    "transactionId": "txn_09",
    "fromEntityId": "entity_dcf649fd_673a_418e_b16b_044c5eaf1fa5",
    "fromAccountId": "acc_a9c0c0c7_3fbd_4b92_a567_5c74c172f648",
    "toEntityId": "entity_dcf649fd_673a_418e_b16b_044c5eaf1fa5",
    "toAccountId": "acc_c881599c_2509_4d75_b120_b642773ca789",
    "exactAmountIn": 0.25,
    // "exactAmountOut": 0.25,
    "depositMemo": "Test 1"
    // "counterPartyRiskAcknowledged": "string"
}
Response:
{
    "success": true,
    "data": {
        "executionId": "cexec_a8ddf280_ac0b_43c0_bf35_9b3192feb059",
        "quote": {
            "inAmount": {
                "amount": 0.25,
                "currency": "USDC"
            },
            "outAmount": {
                "amount": 0.25,
                "currency": "USDC"
            },
            "exchangeRate": {
                "rate": 1,
                "conversion": "1 USDC = 1 USDC"
            },
            "fees": {
                "partnerFees": {
                    "amount": 0,
                    "currency": "USDC"
                },
                "zynkFees": {
                    "amount": 0,
                    "currency": "USDC"
                },
                "totalFees": {
                    "amount": 0,
                    "currency": "USDC"
                }
            }
        },
        "validUntil": "2025-12-30T19:53:15.093Z",
        "message": "Transaction simulation successful",
        "payloadToSign": "{\"parameters\":{\"signWith\":\"EzGZ4e5UxEsUmeq2Gk8kxSDHoBxJ9eN4XZA4nW317AvC\",\"type\":\"TRANSACTION_TYPE_SOLANA\",\"unsignedTransaction\":\"01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008001000104cfd39f2c8e6c02d66f3ec5e423b7bf032ff86af5a118644f9b2700bbdb8e054155b5bcbd39fd4e49f7102482d8e299fb732f6c7489b260d4eecf128c1eb27d2c22898b046b5fc825e1599341a7987b249a75951d45d298f658b66cf74522226906ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a92e3077d44868432d894040b95516cef1be6b06d64e9e8062bb282d18a2e05add010303010200090380b2e60e0000000000\"},\"type\":\"ACTIVITY_TYPE_SIGN_TRANSACTION_V2\",\"organizationId\":\"e7a8267c-4b7a-4791-87ca-3abecb572097\",\"timestampMs\":\"1767120794890\"}"
    }
}

{{base_url}}/api/v1/transformer/transaction/transfer
{
  "executionId": "cexec_0a663c00_b304_4429_aad9_e5a9c3cfb7ab",
  "payloadSignature": "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZDFlYjc5Y2UyZmYwZTg4ODNkODU0MTIzZTkzZTA4ZGQ1NDA3MjkxZGYwMDIwYjc5NGYxNGNiMzUxNzgiLCJzY2hlbWUiOiJTSUdOQVRVUkVfU0NIRU1FX1RLX0FQSV9QMjU2Iiwic2lnbmF0dXJlIjoiMzA0NDAyMjA3NzBkZjRmYWUyMTE1YWZmMTBjMzA0NmIyZjgzODg2YTY3ODRiZTMwOTMzOWIzYzMyMDI1ZWFiNjUxY2RiNzAzMDIyMDE2MTBjMDg3OWUzYThjZjRiZGY3ZTE0NDQ2NDczZTVjMTJiYTViOTlmZTIxYWExZjhiOWZmN2YyOGQ5ZTA1ZWMifQ",
  "transferAcknowledgement": "true",
  "signatureType": "ApiKey"
}
  Response:
  {
    "success": true,
    "data": {
        "executionId": "exec_67d58fee2a31c2e919701a10",
        "message": "Transaction execution started successfully"
    }
}
*/

