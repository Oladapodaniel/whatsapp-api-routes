// Create a basic app with express
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const http = require("http");
const https = require("https");
const server = http.createServer(app);
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const multer = require('multer');
const utils = require('./utils');
const pLimit = require('p-limit');
const fetch = require('node-fetch');
const FormData = require('form-data');

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const baseUrl = process.env.NODE_ENV === "production" ? process.env.BASE_URL : "http://localhost:3333";
const phoneNotConnected = "Phone not connected, kindly connect first"
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Delay utility
const batchSize = 5; // Maximum concurrent requests
const delayMs = 10000; // Delay between batches

app.use(cors({
    origin: '*', // Specify the allowed origin (replace with your client's domain)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify the allowed HTTP methods
    allowedHeaders: 'Content-Type,Authorization', // Specify the allowed headers
    credentials: true, // Allow credentials (cookies, auth headers) to be sent with the request
    optionsSuccessStatus: 204, // Some legacy browsers (IE11) choke on a 204 response. Set to 200 if you want to support such browsers.
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

dotenv.config();
console.log(process.env.NODE_ENV)

const restoreWhatsappSession = async (req, resp) => {
    console.log(`${baseUrl}/instance/list`)
    try {
        const res = await fetch(`${baseUrl}/instance/list`);
        const JSONResponse = await res.json();
        return JSONResponse
    } catch (err) {
        console.log(err.message, 'error trying to restore');
        return err
        // resp.status(500).send('Failed to fetch data');
    }
}

const initializeInstance = async (req) => {
    try {
        const res = await fetch(`${baseUrl}/instance/init?key=${req.query.key}&token=${process.env.TOKEN}`);
        const JSONResponse = await res.json();
        return JSONResponse
    } catch (err) {
        return err
    }
}

const instanceInfo = async (req) => {
    console.log(req.query.key, 'instance key')
    try {
        const res = await fetch(`${baseUrl}/instance/info?key=${req.query.key}`);
        const JSONResponse = await res.json();
        return JSONResponse
    } catch (err) {
        console.log(err.message);
        return err
    }
}

const sendMessage = async (req, payload) => {
    console.log(payload, 'reaching here')
    console.log(req.query.key, 'reaching 22')
    const res = await fetch(`${baseUrl}/message/text?key=${req.query.key}`, {
        method: 'POST', // Change the method to POST
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const JSONResponse = await res.json();
    const reportPayload = {
        phone: payload.id,
        messageGroupID: payload.messageGroupID,
        deliveryStatus: JSONResponse.error,
        text: req.body.message
    }
    console.log(reportPayload, 'reportpayload test')
    // console.log(JSONResponse.data.message.extendedTextMessage, 'reportinnerpayload test')
    // await sendDeliveryReport(reportPayload);


    console.log(JSONResponse, 'senttt')
    return JSONResponse;
}

const sendImageMessage = async (req, formData, payload) => {
    try {
        const res = await fetch(`${baseUrl}/message/image?key=${req.query.key}`, {
            method: 'POST',
            body: formData
        });

        const jsonResponse = await res.json();
        console.log(jsonResponse, 'sent');
        return jsonResponse
    } catch (err) {
        console.error(err.message);
    }
};

const sendVideoMessage = async (req, formData, payload) => {
    try {
        const res = await fetch(`${baseUrl}/message/video?key=${req.query.key}`, {
            method: 'POST',
            body: formData
        });

        const jsonResponse = await res.json();
        console.log(jsonResponse, 'sent');
        return jsonResponse
    } catch (err) {
        console.error(err.message);
    }
};


let instanceCheckNum = 0
const checkIfInstanceIsActive = async (req) => {
    return new Promise((resolve, reject) => {
        // Check if instance is active before sending message
        instanceInfo(req)
            .then((response) => {
                console.log(response, 'response here');
                if (response.error) {
                    // Initialize session
                    initializeInstance(req)
                        .then(res => {
                            console.log('instance reinitilaized, checking if instance is active')
                            checkIfInstanceIsActive(req);
                        }).catch((err) => console.log(err, 'instance reinitialized failed'))
                    console.log('initResponse')
                    setTimeout(() => {
                        console.log("Instance not active yet, check will commence again in 10 secs");
                        checkIfInstanceIsActive(req).then(resolve).catch(reject);
                    }, 10000);
                } else {
                    if (response && response.instance_data && response.instance_data.user && Object.keys(response.instance_data.user).length > 0) {
                        resolve(response);
                    } else {
                        setTimeout(() => {
                            instanceCheckNum++
                            if (instanceCheckNum >= 10) {
                                console.log('phone is not connecteddddddddd 1')
                                resolve({ message: phoneNotConnected })
                                instanceCheckNum = 0
                            } else {
                                console.log('phone is not connecteddddddddd 2')
                                console.log("Instance not active yet, check will commence again in 10 secs");
                                checkIfInstanceIsActive(req).then(resolve).catch(reject);
                            }
                        }, 10000);
                    }
                }
            })
            .catch((error) => {
                console.log(error, 'error here');
                reject(error);
            });
    });
};


const sendDeliveryReport = async (payload) => {
    try {
        const res = await fetch(`https://churchplusv3coreapi.azurewebsites.net/WhatsAppDeliveryReport`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const textResponse = await res.text(); // Get raw text response
        console.log(textResponse, 'reported'); // Log it to see what you received
    }
    catch (err) {
        console.log(err)
    }
}



app.get('/', (req, res) => {
    res.send('<h1>Node application for whatsapp api routes</h1>');
});

console.log(process.env.TOKEN, 'token')
app.get('/instance/list', async (req, resp) => {
    const JSONResponse = await restoreWhatsappSession(req, resp)
    resp.send(JSONResponse);
});

app.get('/initializeWhatsapp', async (req, resp) => {
    initializeInstance(req)
        .then(response => {
            console.log(response)
            resp.send(response);
        })
        .catch(error => {
            console.error(error)
            resp.status(500).send('Failed to fetch data');
        })
});

app.get('/scanQRCode', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/instance/qrbase64?key=${req.query.key}`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

app.get('/single/instanceInfo', async (req, resp) => {
    instanceInfo(req)
        .then(response => {
            console.log(response, 'instanceInfo')
            resp.send(response);
        })
        .catch(error => {
            console.error(error)
            resp.status(500).send('Failed to fetch data');
        })
});

app.get('/groups/getAllWhatsappGroups', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/group/getallgroups?key=${req.query.key}`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

const sendText = async (req) => {

    console.log('Processing recipients...');

    const recipients = req?.body?.recipients || [];
    const messageTemplate = req?.body?.message || '';

    const limit = pLimit(batchSize); // Set concurrency limit
    const results = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        console.log(`Processing batch ${Math.ceil((i + 1) / batchSize)}...`);

        const batchPromises = batch.map((item) =>
            limit(async () => {
                let message = messageTemplate;
                const chatId = item.phoneNumber.startsWith('+')
                    ? item.phoneNumber.substring(1)
                    : item.phoneNumber;

                if (message?.includes("#name#")) {
                    message = message.replaceAll("#name#", item.name || '');
                }

                const payload = {
                    id: chatId,
                    message,
                    messageGroupID: req.body.id,
                };

                try {
                    const response = await sendMessage(req, payload);
                    return { success: true, response, recipient: item };
                } catch (error) {
                    console.error(`Error sending message to ${item.phoneNumber}:`, error.message);
                    return { success: false, error: error.message, recipient: item };
                }
            })
        );

        // Wait for the batch to complete
        const batchResults = await Promise.all(batchPromises);
        console.log(batchResults, 'batchResults')
        results.push(...batchResults);

        // Send Delivery Report
        const reportPayload = batchResults.map(i => ({
            error: i.response?.error,
            messageGroupID: req.body.id,
            phone: i.recipient?.phoneNumber,
            message: messageTemplate,
        }))

        console.log(reportPayload, 'report payload here')
        await sendDeliveryReport(reportPayload);

        // Delay before the next batch, if more recipients remain
        if (i + batchSize < recipients.length) {
            console.log(`Delaying for ${delayMs / 1000} seconds before the next batch...`);
            await delay(delayMs);
        }
    }

    console.log('Processing complete.');
    return results; // Return results for logging or further handling
}

const sendImage = async (req, resp) => {

    try {
        // Extract data from req.body and req.file
        const { id, message, fileUrl, recipients } = req.body;
        console.log(id, message, fileUrl, recipients, 'here');
        const { url, fileType } = JSON.parse(fileUrl);
        const bufferFile = await utils.getBuffer(url); // Assuming `getBuffer` fetches the file buffer

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !message || !fileUrl) {
            return resp.status(400).send('Invalid request body');
        }

        const limit = pLimit(batchSize); // Set concurrency limit
        const results = [];

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            console.log(`Processing batch ${Math.ceil((i + 1) / batchSize)}...`);
            console.log(message, 'message')
            const batchPromises = batch.map((item) =>
                limit(async () => {
                    let caption = message;
                    if (message?.includes("#name#")) {
                        caption = message.replaceAll("#name#", item.name || '');
                    }
                    const chatId = item.phoneNumber.startsWith('+')
                        ? item.phoneNumber.substring(1)
                        : item.phoneNumber;

                    // Create a new FormData object
                    const formData = new FormData();
                    formData.append('id', chatId);
                    formData.append('caption', caption);

                    formData.append('file', bufferFile, {
                        contentType: fileType,
                        name: 'file',
                        filename: 'fileName',
                    })

                    console.log('Sending image message...');
                    const payload = {
                        id: chatId,
                        message,
                        messageGroupID: id,
                    };

                    try {
                        const response = await sendImageMessage(req, formData, payload);
                        return { success: true, recipient: item, response };
                    } catch (error) {
                        console.error(`Error sending image message to ${item.phoneNumber}:`, error.message);
                        return { success: false, error: error.message, recipient: item };
                    }
                })
            );

            // Wait for the current batch to complete
            const batchResults = await Promise.all(batchPromises);
            console.log(batchResults, 'bacthresults here')
            results.push(...batchResults);
            // Send Delivery Report
            const reportPayload = batchResults.map(i => ({
                error: i.response?.error,
                messageGroupID: id,
                phone: i.recipient?.phoneNumber,
                message
            }))

            await sendDeliveryReport(reportPayload);

            // Delay before the next batch, if more recipients remain
            if (i + batchSize < recipients.length) {
                console.log(`Delaying for ${delayMs / 1000} seconds before the next batch...`);
                await delay(delayMs);
            }
        }

        // Send the final response after all messages have been sent
        resp.send({ message: 'All messages sent with images', results });

    } catch (err) {
        console.error(err, 'error here');
        resp.status(500).send('Internal server error');
    }
}

const sendVideo = async (req, resp) => {

    try {
        // Extract data from req.body and req.file
        const { id, message, fileUrl, recipients } = req.body;
        console.log(id, message, fileUrl, recipients, 'here');
        const { url, fileType } = JSON.parse(fileUrl);
        // const fileBody = getFileBody.getFileBody();
        const bufferFile = await utils.getBuffer(url); // Assuming `getBuffer` fetches the file buffer

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !message || !fileUrl) {
            return resp.status(400).send('Invalid request body');
        }

        const limit = pLimit(batchSize); // Set concurrency limit
        const results = [];

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            console.log(`Processing batch ${Math.ceil((i + 1) / batchSize)}...`);
            const batchPromises = batch.map((item) =>
                limit(async () => {
                    let caption = message;
                    if (message?.includes("#name#")) {
                        caption = message.replaceAll("#name#", item.name || '');
                    }
                    const chatId = item.phoneNumber.startsWith('+')
                        ? item.phoneNumber.substring(1)
                        : item.phoneNumber;

                    // Create a new FormData object
                    const formData = new FormData();
                    formData.append('id', chatId);
                    formData.append('caption', caption);

                    formData.append('file', bufferFile, {
                        contentType: fileType,
                        name: 'file',
                        filename: 'fileName',
                    })

                    console.log('Sending video message...');
                    const payload = {
                        id: chatId,
                        message,
                        messageGroupID: id,
                    };

                    try {
                        const response = await sendVideoMessage(req, formData, payload);
                        return { success: true, recipient: item, response };
                    } catch (error) {
                        console.error(`Error sending video message to ${item.phoneNumber}:`, error.message);
                        return { success: false, error: error.message, recipient: item };
                    }
                })
            );

            // Wait for the current batch to complete
            const batchResults = await Promise.all(batchPromises);
            console.log(batchResults, 'bacthresults here')
            results.push(...batchResults);
            // Send Delivery Report
            const reportPayload = batchResults.map(i => ({
                error: i.response?.error,
                messageGroupID: id,
                phone: i.recipient?.phoneNumber,
                message
            }))

            await sendDeliveryReport(reportPayload);

            // Delay before the next batch, if more recipients remain
            if (i + batchSize < recipients.length) {
                console.log(`Delaying for ${delayMs / 1000} seconds before the next batch...`);
                await delay(delayMs);
            }
        }

        // Send the final response after all messages have been sent
        resp.send({ message: 'All messages sent with videos', results });

    } catch (err) {
        console.error(err, 'error here');
        resp.status(500).send('Internal server error');
    }
}

app.post('/send/text', async (req, resp) => {
    await sendText(req);
    // sentBroadCastList()
    // Send the final response after all messages have been sent
    resp.send({ message: 'All messages sent' });
});

app.post('/send/image', async (req, resp) => {
    await sendImage(req, resp)
});

app.post('/send/video', async (req, resp) => {
    await sendVideo(req, resp)
});


app.delete('/instance/logout', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/instance/logout?key=${req.query.key}`, {
            method: 'DELETE'
        });
        console.log(res, 'resss')
        if (!res.ok) {
            resp.send({ message: `HTTP error! Status: ${res.status}` });
        }
        console.log('worked')

        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (error) {
        console.error(error)
    }
})


app.post('/api/whatsapp/schedule', async (req, resp) => {
    try {
        console.log(req.body, 'schedule request here')
        const { ChatRecipients, Message, ID, SessionId, Date, FileUrl } = req.body;
        req.query.key = SessionId;
        req.body.recipients = ChatRecipients
        req.body.message = Message;
        req.body.messageGroupID = ID;
        req.body.date = Date;
        req.body.fileUrl = FileUrl
        console.log({ ChatRecipients, Message, ID, SessionId, Date, FileUrl })
        console.log(req.body)

        // Initialize session
        const initResponse = await initializeInstance(req);
        console.log(!initResponse.error ? 'Initialized' : 'Not Initialized')

        // Restore session
        const restoreResponse = await restoreWhatsappSession(req, resp);
        console.log(restoreResponse, 'restored');
        if (!restoreResponse.error) {
            if (restoreResponse.data && restoreResponse.data.length > 0) {
                let checkSession = restoreResponse.data.find(
                    (i) => i.instance_key.toLowerCase() === SessionId.toLowerCase()
                );
                if (checkSession) {
                    // Wait until instance is established
                    // Check if instance is active
                    const response = await checkIfInstanceIsActive(req);
                    if (response && response?.message?.includes(phoneNotConnected)) {
                        resp.send(response);
                        return;
                    }
                    console.log(response, 'Instance active');
                    if (FileUrl && FileUrl.length > 0) {
                        req.body.fileUrl = FileUrl
                        let parseFile = JSON.parse(FileUrl);
                        if (parseFile.fileType.includes("image")) {
                            await sendImage(req, resp)
                        } else if (parseFile.fileType.includes("video")) {
                            await sendVideo(req, resp)
                        } else {
                            console.log("Different file type")
                        }
                    } else {
                        await sendText(req)
                        // Send the final response after all messages have been sent
                        resp.send({ message: 'All messages sent' });
                    }
                } else {
                    resp.send({ message: phoneNotConnected });
                    //   getQRCode();
                    // initialiseWhatsapp();
                }
            } else {
                resp.send({ message: phoneNotConnected });
                // getQRCode();
                // initialiseWhatsapp();
            }
        }
        return;

    } catch (error) {
        console.error(error);
        resp.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log('running at', port)
});
