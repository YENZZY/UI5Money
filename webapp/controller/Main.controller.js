sap.ui.define([
    "money/controller/BaseController",
    "sap/ui/model/json/JSONModel"
],
function (Controller, JSONModel) {
    "use strict";

    // 라우터 설정: "Main" 페이지가 로드될 때 _onRouteMatched 함수 호출
    return Controller.extend("money.controller.Main", {
        onInit: function () { // 초기화 시 라우터 설정을 통해 "Main" 페이지가 로드될 때 _onRouteMatched 메소드를 호출
           
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);
        },

         // 데이터 가져오기 메소드 호출
        _onRouteMatched: function () { // 해당 라우트가 매칭되면 _getData 메소드를 호출
            
            this._getData();
        },

        //조회 메인 모델에서 데이터를 읽어와 JSON 모델로 설정, 데이터 읽기 실패 시 메시지 박스를 표시
        _getData: function () { 
            
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기 //다른 데이터 가져올때 getModel(money)이런 식

            this._getODataRead(oMainModel, "/Head").done(
                
                function(aGetData){
                
                // 데이터 읽기 성공 시 JSON 모델로 설정 , JSON 모델 객체를 생성한 후, 이 데이터를 모델에 설정
                this.setModel(new JSONModel(aGetData), "dataModel")
                
                // 데이터 읽기 실패 시 메시지 박스 표시
            }.bind(this)).fail(function(){
                MessageBox.information("Read Fail");
            }).always(function(){
                // 항상 실행되는 코드
            });

        },

        // "Page" 페이지로 네비게이션
        onCreate: function (){
            
            this.navTo("Page",{}) //이동하는 페이지, 파라미터 값
        },

        //날짜 설정 날짜 값을 포맷팅하여 문자열로 반환 , 날짜 포맷터 함수
        dateFormatter: function(sValue){
            
            var dateVar = new Date(sValue);

            return dateVar.getFullYear() + "-" + (dateVar.getMonth() +1) + "-" + dateVar.getDate();
        },

        // 데이터 이동 함수 , 이벤트가 발생한 테이블 행의 데이터를 가져와 해당 페이지로 네비게이션
        onMove: function(oEvent) {
            //debugger;
            var getData = this.getModel("dataModel").getData();
            var index = oEvent.getSource().getParent().getParent().getIndex();
            var oRowData = getData[index];

            this.navTo("Page",{Uuid : oRowData.Uuid});
            
        },

        // 삭제 테이블에서 선택된 행의 데이터를 삭제하고, 삭제 후 데이터를 다시 가져옴
        onDelete : function(oEvent){

            // 테이블에서 선택된 인덱스 얻기
            var index =this.byId("table").getSelectedIndex(); //1개일 시 여러개는 ~indices
            var getData = this.getModel("dataModel").getData();
            var oRowData = getData[index];
            var oMainModel = this.getOwnerComponent().getModel();

            var param = "/Head(guid'" + oRowData.Uuid + "')?$expand=to_Item";
            this._getODataDelete(oMainModel, param).done(function(aReturn){
                
                // 삭제 성공 시 데이터 다시 가져오기
                this._getData();
            
            }.bind(this)).fail(function(){
                // chk = false;  삭제 실패 시 처리
            }).always(function(){
                // 항상 실행되는 함수
            });
        }
    });
});
