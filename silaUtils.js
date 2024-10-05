const generateSilaJwtToken = async () => {
  const currentTime = (new Date()).getTime();
  const basicAuthString = 'Basic ' + Buffer.from(`${process.env.SILA_MONEY_CLIENT_ID}` + ':' + `${process.env.SILA_MONEY_CLIENT_SECRET}`).toString('base64');

  const options = {
    method: 'POST',
    url: `https://${process.env.SILA_MONEY_API_URL}/0.2/auth_token`,
    headers: {
      authorization: basicAuthString,
    },
    data: {
      header: {
        created: currentTime,
        app_handle: `${process.env.SILA_MONEY_APP_HANDLE}`,
        version: "0.2",
        reference: uuidv4(),
      },
    }
  };

  let silaAccessToken;
  await axios(options)
    .then(res => {
      silaAccessToken = res.data.access_token.token;
    })
    .catch(err => {console.log(err); throw err; });

  return silaAccessToken;
}

const getSilaProcessorRequestObject = () => {
  return {
    access_token: accessToken,
    account_id: accountId,
    processor: 'sila_money',
  };
}


// a function for making a call to create sila processor token

// const processorTokenResponse = await plaidClient.processorTokenCreate(
//   processorRequest,
// );


// sila money itemInfo

// const itemInfo = {
//   user_id: req.body.user_id,
//   name: institutionName,
//   item_id: exchangeResponse.data.item_id,
//   access_token: exchangeResponse.data.access_token,
//   silamoney_token: silaMoneyToken,
//   silamoney_request_id: processorTokenResponse.data.request_id,
// };



// Call Sila money link_account

//   const options = {
//     method: 'POST',
//     url: `https://${process.env.SILA_MONEY_API_URL}/0.2/link_account`,
//     headers: {
//       authorization: `Bearer ${silaJwtToken}`,
//     },
//     data: {
//       header: {
//         created: (new Date()).getTime(),
//         app_handle: `${process.env.SILA_MONEY_APP_HANDLE}`,
//         // user_handle: `${process.env.SILA_MONEY_APP_HANDLE}-user`,
//         user_handle: `${process.env.SILA_MONEY_USER_HANDLE}`,
//         version: "0.2",
//         reference: uuidv4(),
//       },
//       provider_token: silaMoneyToken,
//       provider: "plaid",
//       account_type: "CHECKING",
//       provider_token_type: "processor",
//       selected_account_id: accountId,
//       account_name: institutionName,
//     }
//   };

//   let linkAccountResponseData;
//   await axios(options)
//     .then(res => {
//       linkAccountResponseData = res.data;
//     })
//     // .catch(err => { console.log(err); throw err; });

// console.log("Sila Link Account response data=", linkAccountResponseData);
