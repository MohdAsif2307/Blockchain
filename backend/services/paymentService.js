// Simulated payment processing with transaction tracking
const db = require("../db/database");

async function processFiatPayment(details) {
  try {
    const { amount, method, currency = "INR", userId, description } = details;

    if (!amount || !method || !userId) {
      return {
        success: false,
        message: "Missing required payment details"
      };
    }

    // Record transaction in database
    const result = await db.run(
      `INSERT INTO transactions (userId, type, amount, description, status)
       VALUES (?, 'PAYMENT', ?, ?, 'completed')`,
      [userId, amount, description || "Dataset Purchase"]
    );

    // Simulate payment processing based on method
    const transactionId = "TXN_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    return {
      success: true,
      transactionId,
      message: `Payment of ${currency} ${amount} processed successfully via ${method}`,
      status: "completed"
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return {
      success: false,
      message: "Payment processing failed: " + error.message
    };
  }
}

async function getPaymentStatus(transactionId) {
  try {
    const transaction = await db.get(
      `SELECT * FROM transactions WHERE id = ? OR description LIKE ?`,
      [transactionId, `%${transactionId}%`]
    );

    if (!transaction) {
      return { status: "not_found" };
    }

    return {
      status: transaction.status,
      amount: transaction.amount,
      type: transaction.type,
      createdAt: transaction.createdAt
    };
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return { status: "error", message: error.message };
  }
}

async function refundPayment(transactionId, reason) {
  try {
    const transaction = await db.get(
      `SELECT * FROM transactions WHERE id = ?`,
      [transactionId]
    );

    if (!transaction) {
      return { success: false, message: "Transaction not found" };
    }

    // Create a refund transaction
    const refundResult = await db.run(
      `INSERT INTO transactions (userId, type, amount, description, status)
       VALUES (?, 'REFUND', ?, ?, 'completed')`,
      [transaction.userId, transaction.amount, `Refund: ${reason}`]
    );

    // Update original transaction status
    await db.run(
      `UPDATE transactions SET status = 'refunded' WHERE id = ?`,
      [transactionId]
    );

    return {
      success: true,
      refundId: refundResult.id,
      message: "Refund processed successfully"
    };
  } catch (error) {
    console.error("Refund error:", error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  processFiatPayment,
  getPaymentStatus,
  refundPayment
};
