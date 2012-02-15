jasmineui.require(["factory!client/asyncSensor"], function (asyncSensorFactory) {
    describe("client/asyncSensor", function () {
        var asyncSensor, mockWindow, loadEventSupport, reloadMarker, globals,
            setTimeoutSpy, setIntervalSpy, XMLHttpRequestMock,
            animationCompleteSpy, transitionCompleteSpy;
        beforeEach(function () {
            setTimeoutSpy = jasmine.createSpy('setTimeout');
            setIntervalSpy = jasmine.createSpy('setInterval');
            XMLHttpRequestMock = function () {

            };
            animationCompleteSpy = jasmine.createSpy('animationComplete');
            transitionCompleteSpy = jasmine.createSpy('transitionComplete');
            mockWindow = {
                setTimeout:setTimeoutSpy,
                clearTimeout:jasmine.createSpy('clearTimeout'),
                setInterval:setIntervalSpy,
                clearInterval:jasmine.createSpy('clearInterval'),
                XMLHttpRequest:XMLHttpRequestMock,
            };
            loadEventSupport = {
                addBeforeLoadListener:jasmine.createSpy('addBeforeLoadListener'),
                loaded:jasmine.createSpy('loaded')
            };
            reloadMarker = {
                inReload:jasmine.createSpy('inReload')
            };
            globals = {
                window: mockWindow,
                $:{
                    fn:{
                        animationComplete:animationCompleteSpy,
                        transitionComplete:transitionCompleteSpy
                    }
                }
            };
            asyncSensor = asyncSensorFactory({
                globals:globals,
                'client/loadEventSupport':loadEventSupport,
                'client/reloadMarker':reloadMarker
            });
            loadEventSupport.loaded.andReturn(true);
            reloadMarker.inReload.andReturn(false);
        });
        describe("timeout handling", function () {
            var callback;
            var someTime = 123;
            beforeEach(function () {
                callback = jasmine.createSpy('callback');
            });
            it('should detect timeout waiting', function () {
                expect(asyncSensor()).toEqual(false);
                mockWindow.setTimeout(callback, someTime);
                expect(asyncSensor()).toEqual(true);
                setTimeoutSpy.mostRecentCall.args[0]();
                expect(asyncSensor()).toEqual(false);
            });
            it("should forward the timeout to the original function", function () {
                mockWindow.setTimeout(callback, someTime);
                expect(setTimeoutSpy).toHaveBeenCalled();
                expect(setTimeoutSpy.mostRecentCall.args[1]).toBe(someTime);
            });
            it("should call the given callback if the timeout happens", function () {
                mockWindow.setTimeout(callback, someTime);
                expect(callback).not.toHaveBeenCalled();
                setTimeoutSpy.mostRecentCall.args[0]();
                expect(callback).toHaveBeenCalled();
            });
            it('should detect timeout clearance with multiple timeouts', function () {
                var handle1 = "someHandle1";
                setTimeoutSpy.andReturn(handle1);
                expect(mockWindow.setTimeout(callback, someTime)).toBe(handle1);
                var handle2 = "someHandle2";
                setTimeoutSpy.andReturn(handle2);
                expect(mockWindow.setTimeout(callback, someTime)).toBe(handle2);
                expect(asyncSensor()).toEqual(true);
                mockWindow.clearTimeout(handle1);
                expect(asyncSensor()).toEqual(true);
                mockWindow.clearTimeout(handle2);
                expect(asyncSensor()).toEqual(false);
            });
        });
        describe('interval handling', function () {
            var callback;
            var someInterval = 123;
            beforeEach(function () {
                callback = jasmine.createSpy('callback');
            });
            it('should detect interval waiting', function () {
                expect(asyncSensor()).toEqual(false);
                mockWindow.setInterval(callback, someInterval);
                expect(asyncSensor()).toEqual(true);
                setIntervalSpy.mostRecentCall.args[0]();
                expect(asyncSensor()).toEqual(true);
            });
            it("should forward the interval to the original function", function () {
                mockWindow.setInterval(callback, someInterval);
                expect(setIntervalSpy).toHaveBeenCalled();
                expect(setIntervalSpy.mostRecentCall.args[1]).toBe(someInterval);
            });
            it("should call the given callback if the interval happens", function () {
                mockWindow.setInterval(callback, someInterval);
                expect(callback).not.toHaveBeenCalled();
                setIntervalSpy.mostRecentCall.args[0]();
                expect(callback).toHaveBeenCalled();
            });
            it('should detect interval clearance with multiple intervals', function () {
                var handle1 = "someHandle1";
                setIntervalSpy.andReturn(handle1);
                expect(mockWindow.setInterval(callback, someInterval)).toBe(handle1);
                var handle2 = "someHandle2";
                setIntervalSpy.andReturn(handle2);
                expect(mockWindow.setInterval(callback, someInterval)).toBe(handle2);
                expect(asyncSensor()).toEqual(true);
                mockWindow.clearInterval(handle1);
                expect(asyncSensor()).toEqual(true);
                mockWindow.clearInterval(handle2);
                expect(asyncSensor()).toEqual(false);
            });
        });
        describe('xhr handling', function () {
            var originalXhr;
            beforeEach(function () {
                XMLHttpRequestMock.prototype = {
                    send:jasmine.createSpy('send').andCallFake(function () {
                        originalXhr = this;
                    }),
                    open:jasmine.createSpy('open')
                }
            });
            it("should forward calls from the instrumented xhr to the original xhr", function () {
                var xhr = new mockWindow.XMLHttpRequest();
                xhr.onreadystatechange = jasmine.createSpy('readyStateChange');
                xhr.open('GET', 'someUrl');
                expect(XMLHttpRequestMock.prototype.open).toHaveBeenCalledWith('GET', 'someUrl');
                xhr.send();
                expect(XMLHttpRequestMock.prototype.send).toHaveBeenCalledWith();
                xhr.onreadystatechange = jasmine.createSpy('onreadystatechange');
                originalXhr.onreadystatechange();
                expect(xhr.onreadystatechange).toHaveBeenCalled();
            });
            it("should copy the properties of the original xhr to the instrumented xhr", function () {
                var xhr = new mockWindow.XMLHttpRequest();
                xhr.open('GET', 'someUrl');
                xhr.send();
                expect(xhr).not.toBe(originalXhr);
                originalXhr.readyState = 2;
                originalXhr.onreadystatechange();
                expect(xhr.readyState).toBe(2);
            });
            it("should wait for the xhr", function () {
                var xhr = new mockWindow.XMLHttpRequest();
                xhr.onreadystatechange = jasmine.createSpy('readyStateChange');
                xhr.open('GET', 'someUrl');
                xhr.send();
                expect(asyncSensor()).toBe(true);
                originalXhr.readyState = 4;
                originalXhr.onreadystatechange();
                expect(asyncSensor()).toBe(false);
            });
            it("should be able to wait for the xhr even when onreadystatechange is set after send, like in jquery", function () {
                var xhr = new mockWindow.XMLHttpRequest();
                xhr.open('GET', 'someUrl');
                xhr.send();
                xhr.onreadystatechange = jasmine.createSpy('readyStateChange');
                expect(asyncSensor()).toBe(true);
                originalXhr.readyState = 4;
                originalXhr.onreadystatechange();
                expect(asyncSensor()).toBe(false);
            })
        });

        it("should detect document loading", function () {
            loadEventSupport.loaded.andReturn(false);
            expect(asyncSensor()).toBe(true);
            loadEventSupport.loaded.andReturn(true);
            expect(asyncSensor()).toBe(false);

        });

        it("should detect reloading of the document", function () {
            reloadMarker.inReload.andReturn(true);
            expect(asyncSensor()).toBe(true);
            reloadMarker.inReload.andReturn(false);
            expect(asyncSensor()).toBe(false);
        });

        it('should detect jquery animation waiting', function () {
            var beforeLoadListenerCalls = loadEventSupport.addBeforeLoadListener.argsForCall;
            for (var i = 0; i < beforeLoadListenerCalls.length; i++) {
                beforeLoadListenerCalls[i][0]();
            }
            var callback = jasmine.createSpy('callback');
            globals.$.fn.animationComplete(callback);
            expect(asyncSensor()).toBe(true);
            animationCompleteSpy.mostRecentCall.args[0]();
            expect(asyncSensor()).toBe(false);
            expect(callback).toHaveBeenCalled();
        });
        it('should detect jquery transition waiting', function () {
            var beforeLoadListenerCalls = loadEventSupport.addBeforeLoadListener.argsForCall;
            for (var i = 0; i < beforeLoadListenerCalls.length; i++) {
                beforeLoadListenerCalls[i][0]();
            }
            var callback = jasmine.createSpy('callback');
            globals.$.fn.transitionComplete(callback);
            expect(asyncSensor()).toBe(true);
            transitionCompleteSpy.mostRecentCall.args[0]();
            expect(asyncSensor()).toBe(false);
            expect(callback).toHaveBeenCalled();
        });
    });

});
