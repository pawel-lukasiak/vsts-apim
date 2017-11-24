import tl = require("vsts-task-lib");
import request = require("request");
import crypto = require("crypto-js");
import * as tasklib from "vsts-task-lib/task";
import { toBase64 } from "request/lib/helpers";

function createAccessToken(identifier: string, key: string): string {
    // Create the proper string format of the datetime for access token (valid for 1 minute)
    let expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 1);

    const expiry = expiryDate.getDate()
    + (expiryDate.getMonth() + 1)
    + expiryDate.getFullYear()
    + expiryDate.getHours()
    + expiryDate.getMinutes()
    + expiryDate.getSeconds();
    tl.debug("Using expiry date" + expiry);

    const dataToSign = identifier + "\n" + expiry;
    const signature = toBase64(crypto.HmacSHA512(dataToSign, key));
    return "SharedAccessSignature uid=" + identifier + "&ex=" + expiry + "&sn=" + signature;
}

export function restCall(serviceConnection: any, restResource: string, httpVerb: string, body: string, headers: any) {

    // Create access token 
    const accessToken = createAccessToken(serviceConnection.identifier, serviceConnection.key);

    // Compose REST endpoint
    const restEndpoint = serviceConnection.url
    + "/subscriptions/" + serviceConnection.subscriptionId
    + "/resourceGroups/" + serviceConnection.resourceGroup
    + "/providers/Microsoft.ApiManagement"
    + "/service/" + serviceConnection.serviceName
    + restResource
    + "?api-version=" + serviceConnection.apiVersion;

    request({
        uri: restEndpoint,
        method: httpVerb,
        headers: {"Authorization": accessToken, ...headers},
        body: body,
        timeout: 20,
        strictSSL: true
    }, this.callBack.bind(this));
}

function callBack(error, response, body) {
    if (error) {
        tl.debug("Request ko with code: '".concat(response && response.statusCode).concat("'. Error is : '").concat(error));
        throw new Error("Request error:".concat(error));
    }

    tl.debug(body);

    if (response.statusCode >= 200 && response.statusCode < 400) {
        tl.debug("Response ok.");
    }
    else {
        tl.debug("Request ko with code: '".concat(response.statusCode).concat("'."));
        throw new Error("Request error with code: '".concat(response.statusCode).concat("'."));
    }
}

export function getAPIMManagementEndpointDetails(inputFieldName): any {

    const apiVersion = "2017-03-01";

    const apimMgmtEndpoint = tasklib.getInput(inputFieldName, true);

    const hostUrl = tasklib.getEndpointUrl(apimMgmtEndpoint, false);
    const auth = tasklib.getEndpointAuthorization(apimMgmtEndpoint, false);
    const identifier = auth.parameters["identifier"];
    const key = auth.parameters["key"];
    const subscriptionId = auth.parameters["subscriptionId"];
    const resourceGroup = auth.parameters["resourceGroup"];
    const service = auth.parameters["service"];

    return {
        "url": hostUrl,
        "identifier": identifier,
        "key": key,
        "subscriptionId": subscriptionId,
        "resourceGroup": resourceGroup,
        "service": service,
        "apiVersion": apiVersion
    };
}