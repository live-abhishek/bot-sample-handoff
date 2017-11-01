function HandoffHanlder(){
    this.directlineAddress = null;
}

HandoffHandler.prototype.sendMsgAgent = function(){

}

var handoffHandler = new HandoffHandler();

module.exports = {
    handoffHandler = handoffHandler
}