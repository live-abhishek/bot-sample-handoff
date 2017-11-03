var builder = require('botbuilder');
var logger = require('../log4js').logger;

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var liveAgentAddress = {};
var userAddress = {};

var handoffConnections = [];

function createHandoffConncetion(session){
    var handoffConnection = {};
    handoffConnection.customerConversationId = session.message.address.conversation.id;
    handoffConnection.customerAddress = session.message.address;
    handoffConnection.agentAddress = liveAgentAddress;
    handoffConnection.customerHandoffState = 'CHAT_START_FROM_USER';
    handoffConnection.lastUpateTime = Date.now();
    return handoffConnection;
}

function messageHandler(session){
    if(session.message.address.channelId === 'directline'){
        directLineMessageHandler(session);
    } else {
        userMessageHandler(session);
    }
}

function handleUserBotMessageHandler(session){
    // TODO: handle this with care, what happens if the message is picture instead of text
    var msg = session.message.text.toLowerCase();
    if(msg == 'help'){
        if(handoffConnections.length >= 5){
            session.send('All our agents are busy. Please try again after some time');
            return;
        }
        var handoffMessage = createStartHandoffMessage(session.message.address.conversation.id);
        var handoffConnection = createHandoffConncetion(session);
        handoffConnections.push(handoffConnection);
        sendProactiveMessage(JSON.stringify(handoffMessage), liveAgentAddress);
        // send to the handoff system
    } else {
        // here goes the bot logic
    }
}

function userMessageHandler(session){
    var handoffConnection = getHandoffConnectionByChannelId(session.message.address.conversation.id);
    if(handoffConnection != null){
        var handoffState = handoffConnection.customerHandoffState;
        if(handoffState === 'HANDOFF_INIT'){
            session.send('Please wait, we are connecting you to one of our agents');
        } else if(handoffState === 'HANDOFF_CHAT'){
            // if message is stop chat then
            // send stop command to the live agent, otherwise
            if(session.message.text.toLowerCase() == 'stop chat'){
                var handoffMessage = createStopHandoffMessage(session.message.address.conversation.id);
                sendProactiveMessage(JSON.stringify(handoffMessage), liveAgentAddress);
                removeHandOffConnectionByChannelId(session.message.address.conversationId);
                session.send('Chat with live agent ended!');
            } else { // send the message to live agent
                var handoffMessage = createTextHandoffMessage(session.message.address.conversation.id, session.message.text);
                sendProactiveMessage(JSON.stringify(handoffMessage), liveAgentAddress);
            }
        } else {
            handleUserBotMessageHandler(session);
        }
    } else {
        handleUserBotMessageHandler(session);
    }
}

function directLineMessageHandler(session){
    // registration of direct line
    var msg = session.message.text.toLowerCase();
    if(msg == ''){
        liveAgentAddress = session.message.address;
    } else {
        var handoffMessage = JSON.parse(session.message.text);
        var handoffConnection = getHandoffConnectionByChannelId(handoffMessage.conversationId);
        if(handoffConnection != null){
            if(handoffMessage.msgCommand == 'CHAT_START_FROM_USER_SUCCESS'){
                handoffConnection.customerHandoffState = 'HANDOFF_CHAT';
                sendProactiveMessage('You are now connected to our agent.', handoffConnection.customerAddress);
            } else if(handoffMessage.msgCommand == 'CHAT_TEXT_FROM_AGENT'){
                sendProactiveMessage(handoffMessage.msgText, handoffConnection.customerAddress);
            }
        }
    }// CHANNEL ID ko CONVERSATION ID karna hai
}

function getHandoffConnectionByChannelId(conversationId){
    var handoffConnection = null;
    for(var i = 0; i < handoffConnections.length; i++){
        if(conversationId == handoffConnections[i].customerConversationId){
            handoffConnection = handoffConnections[i];
        }
    }
    return handoffConnection;
}

function removeHandOffConnectionByChannelId(conversationId){
    var idx = -1;
    for(var i = 0; i < handoffConnections.length; i++){
        if(conversationId == handoffConnections[i].customerConversationId){
            idx = i;
        }
    }
    if(idx > -1){
        handoffConnections.splice(idx, 1 );
    }
}

function createStartHandoffMessage(conversationId){
    return createHandoffMessage(conversationId, 'CHAT_START_FROM_USER', '', Date.now());
}

function createStopHandoffMessage(conversationId){
    return createHandoffMessage(conversationId, 'CHAT_END_FROM_USER', '', Date.now());
}

function createTextHandoffMessage(conversationId, msgText){
    return createHandoffMessage(conversationId, 'CHAT_TEXT_FROM_USER', msgText, Date.now());
}

function createHandoffMessage(conversationId, msgCommand, msgText, msgTimeStamp){
    var handoffMessage  = {};
    handoffMessage.conversationId = conversationId;
    handoffMessage.msgCommand = msgCommand;
    handoffMessage.msgText = msgText;
    handoffMessage.msgTimeStamp = msgTimeStamp;
    return handoffMessage;
}

var bot = new builder.UniversalBot(connector, [
    function(session){
        messageHandler(session);
        /*
        if(session.message.address.channelId === 'directline'){
            if(msg == '' ||msg == 'hi'){
                liveAgentAddress = session.message.address;
                session.send('Now I know you!')
            } else {
                sendProactiveMessage(msg, userAddress);
            }
        } else {
            if(msg == '' ||msg == 'hi'){
                userAddress = session.message.address;
                session.send('welcome_title');
            } else {
                sendProactiveMessage(msg, liveAgentAddress);
            }
        }
        */
    }
]);

bot.on('error', function (e) {
    console.log('And error ocurred', e);
});

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

// Set default locale
bot.set('localizerSettings', {
    botLocalePath: './bot/locale',
    defaultLocale: 'en'
});

// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});


bot.use({
    botbuilder: function (session, next) {
        var text = session.message.text.toLowerCase();
        logger.debug(session.message);
        var supportRegex = localizedRegex(session, ['help']);

        if (supportRegex.test(text)) {
        }

        next();
    }
});


var LocalizedRegexCache = {};
function localizedRegex(session, localeKeys) {
    var locale = session.preferredLocale();
    var cacheKey = locale + ":" + localeKeys.join('|');
    if (LocalizedRegexCache.hasOwnProperty(cacheKey)) {
        return LocalizedRegexCache[cacheKey];
    }

    var localizedStrings = localeKeys.map(function (key) { return session.localizer.gettext(locale, key); });
    var regex = new RegExp('^(' + localizedStrings.join('|') + ')', 'i');
    LocalizedRegexCache[cacheKey] = regex;
    return regex;
}

var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        connectorListener(req, res);
    };
}

// Other wrapper functions
function beginDialog(address, dialogId, dialogArgs) {
    bot.beginDialog(address, dialogId, dialogArgs);
}

function sendMessage(message) {
    bot.send(message);
}

function sendProactiveMessage(message, address) {
    var msg = new builder.Message().address(address);
    msg.text(message);
    bot.send(msg);
}


module.exports = {
    listen: listen,
    beginDialog: beginDialog,
    sendMessage: sendMessage
};