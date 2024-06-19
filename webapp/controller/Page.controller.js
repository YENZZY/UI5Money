sap.ui.define([
    "money/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"
],
function (Controller, JSONModel, Filter,MessageBox) {
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
            var createEnabled = false;  // 생성 버튼 
            var deleteEnabled = false; // 삭제 버튼
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
                createEnabled = true;
                deleteEnabled = true;
            }

            // pageModel 설정 (편집 가능 여부 및 버튼 텍스트)
            this.setModel(
                new JSONModel({ editable: flag, 
                                buttonText: msg,
                                createEnabled: createEnabled,
                                deleteEnabled: deleteEnabled }), "pageModel"
            );
            this.editFlag = flag;
        },

            handleChange : function (oEvent){
                var newValue = oEvent.getParameter("newValue");
                this.setProperty("headModel","Yearmonth", newValue);
        },

   // 데이터 가져오는 메서드
   getData: function () {
    var oMainModel = this.getOwnerComponent().getModel();  
    var aFilter = [];
    aFilter.push(new Filter("Uuid", "EQ", this.Uuid)); // Uuid 필터 추가

    console.log("UUID: ", this.Uuid);

    oMainModel.read("/Head", {
        filters: aFilter,
        urlParameters: {
            "$expand": "to_Item"
        },
        success: function (oData) {
            
            if (oData && oData.results && oData.results.length > 0) {
                var oHeadData = oData.results[0];
                console.log("Head Data: ", oHeadData);
                console.log("Item Data: ", oHeadData.to_Item);

                // oHeadData의 Yearmonth 속성명을 dateVar로 변경하고 Date 타입으로 변환
            if (oHeadData.hasOwnProperty('Yearmonth')) {
                var yearmonth = oHeadData.Yearmonth;

                // yearmonth 문자열을 연도와 월로 분리
                if (yearmonth.length === 6) {
                    var year = parseInt(yearmonth.substring(0, 4), 10);
                    var month = parseInt(yearmonth.substring(4, 6), 10) - 1; // 월은 0부터 시작하므로 -1

                    // Date 객체 생성
                    var dateVar = new Date(year, month);
                    oHeadData.dateVar = dateVar;
                }
            }

                this.setModel(new JSONModel(oHeadData), "headModel");
                if (oHeadData.to_Item && oHeadData.to_Item.results) {
                    this.setModel(new JSONModel(oHeadData.to_Item.results), "itemModel");
                }
            }
        }.bind(this),
        error: function (oError) {
            console.error("Read Fail", oError);
        }
    });
},
        // 저장 버튼 클릭 시 호출되는 메서드
        onSave: function () {

            if(this.editFlag) {

                var oMainModel = this.getOwnerComponent().getModel();
                var headData = this.getModel("headModel").getData();
                var itemData = this.getModel("itemModel").getData();

                delete headData.dateVar;
                

                // getData['Unit'] = 'KRW';
                
                if(this.Uuid){ // 수정 후 저장시 업데이트
                    
                    delete headData.to_Item;
                    // Head의 metadata에서 URI를 추출
                    var headUri = headData.__metadata.uri;
                    var startIndex = headUri.indexOf("/Head");
                    var extractedUri = headUri.substring(startIndex);

                    //  Uuid 값이 들어간 uri 경로
                    var param = extractedUri;
                  
                    this._getODataUpdate(oMainModel, param, headData).done(function(aReturn){

                        itemData.forEach(item => {
                            if (item.Uuid) {
                                var itemUri = item.__metadata.uri.substring(item.__metadata.uri.indexOf("/Item("));
                                this._getODataUpdate(oMainModel, itemUri, item).done(function(aReturn) {   
                                    // 성공 시 처리할 코드
                                }.bind(this)).fail(function(err) {
                                    // 실패 시 처리할 코드
                                }).always(function() {
                                    // 항상 실행될 코드
                                });
                            } else {
                                item.Parentsuuid = headData.Uuid;
                                var newUri = param + "/to_Item";
                                this._getODataCreate(oMainModel, newUri, item).done(function(aReturn) {   
                                    // 성공 시 처리할 코드
                                }.bind(this)).fail(function(err) {
                                    // 실패 시 처리할 코드
                                }).always(function() {
                                    // 항상 실행될 코드
                                });
                            }
                        });
                        
        
                    this.navTo("Main", {});

                    }.bind(this)).fail(function(){
                        
                    }).always(function(){
        
                    });

                } else { // 메인화면에서 생성하는 모드
                    this._getODataCreate(oMainModel, "/Head", headData).done(function (aReturn) {
                        var headUuid = aReturn.Uuid;
                        console.log("uri!!", headUuid);
                        // headData의 UUID를 itemData에 설정
                        itemData.forEach(item => {
                            item.Parentsuuid = headUuid;
                            var newUri = "/Head(Uuid=guid'" + headUuid + "')/to_Item";
                            this._getODataCreate(oMainModel, newUri, item).done(function (aReturn) {
                                // 성공 시 처리할 코드
                            }.bind(this)).fail(function (err) {
                                // 실패 시 처리할 코드
                            }).always(function () {
                                // 항상 실행될 코드
                            });
                        });
            
                        this.navTo("Main", {});
        
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
       
        onDelete: function (oEvent) {
            var oTable = this.byId("table");
            var aSelectedIndices = oTable.getSelectedIndices();
            var itemData = this.getModel("itemModel").getData();
            var oMainModel = this.getOwnerComponent().getModel();
            var headData = this.getModel("headModel").getData(); // head의 데이터를 가져옴
        
            if (aSelectedIndices.length === 0) {
                MessageBox.information("선택된 항목이 없습니다.");
                return;
            }
        
            // 선택된 행의 데이터를 삭제하는 함수
            var aDeletePromises = aSelectedIndices.map(function(index) {
                var oRowData = itemData[index]; // 선택된 각 행의 데이터를 가져옴
        
                // head의 Uuid와 item의 Parentsuuid를 비교
                if (oRowData.Parentsuuid === headData.Uuid) {
                    var param = oRowData.__metadata.uri.substring(oRowData.__metadata.uri.indexOf("/Item(")); // OData 삭제 요청을 위한 URL 파라미터 생성
                    console.log(param);
                    return this._getODataDelete(oMainModel, param); // OData 삭제 요청을 비동기로 수행하고, 해당 프로미스를 반환
                } else {
                    return Promise.resolve(); // 비교 결과가 일치하지 않으면 빈 프로미스 반환
                }
            }.bind(this));
        
            // 모든 삭제 요청이 완료되면 실행되는 코드
            Promise.all(aDeletePromises).then(function() {
                this.getData(); // 데이터 다시 가져오기
                MessageBox.success("삭제 성공");
            }.bind(this)).catch(function(oError) {
                var sErrorMessage = "삭제 실패";
                if (oError && oError.responseText) {
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        sErrorMessage = oErrorResponse.error.message.value || sErrorMessage;
                    } catch (e) {
                        // JSON 파싱 에러가 발생하면 기본 메시지 사용
                    }
                }
                MessageBox.error(sErrorMessage);
            }).finally(function() {
                // 항상 실행되는 코드
            });
        }      
    });
});
