// const axios = require("axios");

// const createPayment = async (req, res) => {
//   try {
//     const response = await axios.post(
//       "https://payments.yoco.com/api/checkouts",
//       {
//         amount: req.body.amount,
//         currency: "ZAR",
//         cancelUrl: req.body.cancelUrl,
//         successUrl: req.body.successUrl,
//         failureUrl: req.body.failureUrl,
//         metadata: req.body.metadata,
//         totalDiscount: req.body.totalDiscount,
//         totalTaxAmount: req.body.totalTaxAmount,
//         subtotalAmount: req.body.subtotalAmount,
//         lineItems: null,
//       },
//       {
//         headers: {
//           Authorization: "Bearer sk_test_cf22177cvKQB93Qec734ed889edf",
//         },
//       }
//     );

//     res.status(200).json(response.data);
//   } catch (error) {
//     console.error(
//       "Error details:",
//       error.response ? error.response.data : error.message
//     );
//     res.status(500).json({
//       message: "Failed to create checkout",
//       error: error.response ? error.response.data : error.message,
//     });
//   }
// };

// module.exports = { createPayment };

// //  Authorization: 'Bearer sk_test_cf22177cvKQB93Qec734ed889edf',
 

const axios = require("axios");

const createPayment = async (req, res) => {
  try {
    const response = await axios.post(
      "https://payments.yoco.com/api/checkouts",
      {
        amount: req.body.amount,
        currency: "ZAR",
        cancelUrl: req.body.cancelUrl,
        successUrl: req.body.successUrl,
        failureUrl: req.body.failureUrl,
        metadata: req.body.metadata,
        totalDiscount: req.body.totalDiscount,
        totalTaxAmount: req.body.totalTaxAmount,
        subtotalAmount: req.body.subtotalAmount,
        lineItems: null,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        },
      }
    );

    // Call the transaction API to save the transaction details
    const transactionData = {
      amount: response.data.amount,
      currency: response.data.currency,
      id: response.data.id,
      merchantId: response.data.merchantId,
      metadata: response.data.metadata,
      status: response.data.status,
    };

    await axios.post(
      "https://hammerhead-app-lqsdj.ondigitalocean.app/api/transactions",
      transactionData
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error details:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      message: "Failed to create checkout",
      error: error.response ? error.response.data : error.message,
    });
  }
};

module.exports = { createPayment };
