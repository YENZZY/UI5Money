sap.ui.define([
    "money/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter"
],
function (Controller, JSONModel, MessageBox, Filter) {
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

        _getData: async function () {
            var oMainModel = this.getOwnerComponent().getModel();
        
            try {
                // Head 엔티티의 데이터를 비동기적으로 읽어옴, await 비동기 호출이 완료될 때까지 기다림
                var aGetData = await this._getODataRead(oMainModel, "/Head");
                console.log(aGetData); // 데이터 읽기 완료 후 로그 출력
                
                // 각 항목에 대해 순차적으로 처리
                for (var item of aGetData) {
                    console.log("Processing item:", item); // 각 항목을 순차적으로 처리
                    
                    // to_Item의 원본 URI 가져오기
                    var readContext = item.to_Item.__deferred.uri.substring(item.to_Item.__deferred.uri.indexOf("/Head"));
                    console.log("uri", readContext);
                    // 필터 설정
                    var aFilter = [];
                    // URL 파라미터 설정 (Amount 속성만 선택)
                    var oParameters = {
                        "$select": "Amount"
                    };
                    
                    // 각 항목에 대해 OData 읽기 요청을 비동기적으로 처리
                    var data = await this._getODataRead(oMainModel, readContext, aFilter, oParameters);
                    console.log("Read data for item:", data); // 각 항목에 대해 데이터 읽기 완료 후 로그 출력
        
                    // to_Item의 amount 값을 찾아 더하기
                    var totalAmount = 0; // 각 항목마다 totalAmount 초기화
                    if (data && Array.isArray(data)) { //배열인지 확인
                        data.forEach(function(subItem) {
                            if (subItem.Amount) {
                                totalAmount += parseFloat(subItem.Amount); // Amount 값을 숫자로 변환하여 합산
                            }
                        });
                    }
                    item.Amountsum = totalAmount; // 합산 값을 item.Amountsum에 저장
                }
        
                // 모든 OData 읽기 요청이 완료된 후에 데이터 모델 설정
                this.setModel(new JSONModel(aGetData), "dataModel");
            } catch (error) {
                MessageBox.information("Read Fail");
            }
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
        onDelete: function (oEvent) {
            var oTable = this.byId("table");
            var aSelectedIndices = oTable.getSelectedIndices();
            var getData = this.getModel("dataModel").getData();
            var oMainModel = this.getOwnerComponent().getModel();

            if (aSelectedIndices.length === 0) {
                MessageBox.information("선택된 항목이 없습니다.");
                return;
            }

            // 선택된 행의 데이터를 삭제하는 함수
            var aDeletePromises = aSelectedIndices.map(function(index) {
                var oRowData = getData[index]; // 선택된 각 행의 데이터를 가져옴
                var param = "/Head(Uuid=guid'" + oRowData.Uuid + "')"; // OData 삭제 요청을 위한 URL 파라미터 생성
                return this._getODataDelete(oMainModel, param); // OData 삭제 요청을 비동기로 수행하고, 해당 프로미스를 반환
            }.bind(this));

            // 모든 삭제 요청이 완료되면 실행되는 코드
            Promise.all(aDeletePromises).then(function() {
                this._getData(); // 데이터 다시 가져오기
                MessageBox.success("삭제 성공");
            }.bind(this)).catch(function() {
                MessageBox.error("삭제 실패");
            }).finally(function() {
                // 항상 실행되는 코드
            });
        },
    });
});
