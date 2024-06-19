sap.ui.define([
    "money/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter"
],
function (Controller, JSONModel, Filter) {
    "use strict";
    
    return Controller.extend("money.controller.Page", {
        // 컨트롤러 초기화 메서드
        onInit: function () {
            this.getRouter().getRoute("Page").attachMatched(this._onRouteMatched, this);
        },

        // 신규 항목을 생성하는 메서드
        onCreate: function () {
            // TODO: 신규 항목 생성 로직 구현
            var itemJson = {
                Title: undefined,
                Type: "O",
                Content: undefined,
                Amount: 0,
                Unit : "KRW"
            };

            var getData = this.getModel("itemModel").getData();
            getData.push(itemJson);
            this.setModel(new JSONModel(getData), "itemModel");
        },

        // 라우트가 매치될 때 호출되는 메서드
        _onRouteMatched: function(oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this.Uuid = oArgs.Uuid;
            this._setModel();
        },

        // 모델을 설정하는 메서드
        _setModel: function () {
            var flag;
            var oBundle = this.getResourceBundle();
            var msg;

            // selectModel 설정 (수입/지출 선택 항목)
            this.setModel(
                new JSONModel([{ Key: "I", Text: "수입" }, { Key: "O", Text: "지출" }]), "selectModel"
            );

            // Uuid가 있을 경우 (편집 모드)
            if (this.Uuid) {
                this.getData();
                flag = false;
                msg = oBundle.getText("edit");
            } else {

                // Uuid가 없을 경우 (신규 모드)
                
                var dateVar = new Date();
                var monthVar = dateVar.getMonth()+1;
                if(monthVar < 10){
                    monthVar = "0" + monthVar;
                }
                var Yearmonth = dateVar.getFullYear() + "" + monthVar;

                 this.setModel(
                     new JSONModel({
                      Yearmonth : Yearmonth,
                      dateVar : dateVar
                   }), "headModel"
                 );

                 console.log(dateVar);

                
                this.setModel(new JSONModel([]), "itemModel");

                flag = true;
                msg = oBundle.getText("save");
            }

            // pageModel 설정 (편집 가능 여부 및 버튼 텍스트)
            this.setModel(
                new JSONModel({ editable: flag, buttonText: msg }), "pageModel"
            );
            this.editFlag = flag;
        },

            handleChange : function (oEvent){
                var newValue = oEvent.getParameter("newValue");
                this.setProperty("headModel","Yearmonth", newValue);
        },

        // 저장 버튼 클릭 시 호출되는 메서드
        onSave: function () {
            if (this.editFlag) { // 편집 가능 상태일 경우
                var oMainModel = this.getOwnerComponent().getModel();
                var headData = this.getModel("headModel").getData();
                var itemData = this.getModel("itemModel").getData();

                delete headData.dateVar;
                headData.to_Item =itemData;

                // getData['Unit'] = 'KRW'; // 통화 단위 설정

                if (this.Uuid) { // 업데이트 모드
                    var param = "/Head(guid'" + this.Uuid + "')";
                    this._getODataUpdate(oMainModel, param, headData).done(function (aReturn) {
                        this.navTo("Main", {});
                  
                    }.bind(this)).fail(function () {
                        // 업데이트 실패 처리 로직
                    }).always(function () {
                        // 항상 실행되는 로직
                    });

                } else { // 신규 모드
                    console.log(headData);
                    this._getODataCreate(oMainModel, "/Head", headData).done(function (aReturn) {
                        this.navTo("Main", {})
                 
                    }.bind(this)).fail(function () {
                        // 생성 실패 처리 로직
                    }).always(function () {
                        // 항상 실행되는 로직
                    });
                }

            } else { // 편집 불가능 상태일 경우
                var oBundle = this.getResourceBundle();
                var msg = oBundle.getText("save");

                this.setModel(
                    new JSONModel({ editable: true, buttonText: msg }), "pageModel"
                );

                this.editFlag = true;
            }
        },

        // 데이터 가져오는 메서드
        getData: function () {
            var oMainModel = this.getOwnerComponent().getModel();  
            var aFilter = [];
            aFilter.push(new Filter("Uuid", "EQ", this.Uuid)); // Uuid 필터 추가

            this._getODataRead(oMainModel, "/Head", aFilter).done(function (aGetData) {
       
                this.setModel(new JSONModel(aGetData[0]), "headModel"); // 가져온 데이터를 headModel에 설정
                this.setModel(new JSONModel(aGetData[0].to_Item), "itemModel"); // item 데이터를 itemModel에 설정
                console.log(headModel);
                console.log(itemModel);
            }.bind(this)).fail(function () {
          
                MessageBox.information("Read Fail"); // 데이터 읽기 실패 처리
         
            }).always(function () {
                // 항상 실행되는 로직
            });
        }
    });
});
