/**
 * @fileoverview Jasmine Async JsTestDriver Adapter.
 * Adapted from an old version of
 * https://github.com/angular/angular.js/blob/master/lib/jasmine-jstd-adapter/JasmineAdapter.js
 * written by ibolmo@gmail.com (Olmo Maldonado) and misko@hevery.com (Misko Hevery)
 * @author tobias.bosch@opitz-consulting.com (Tobias Bosch)
 */

(function(describe, it, beforeEach, afterEach, addResult){

var frame = function(parent, name){
	var caseName = '';
	if (parent && parent.caseName) caseName = parent.caseName + ' ';
	if (name) caseName += name;

	var before = [],
		after = [];

	return {
		name: name,
		caseName: caseName,
		parent: parent,
		testCase: AsyncTestCase(caseName),
		before: before,
		after: after,
		runBefore: function(){
			if (parent) parent.runBefore.apply(this);
			for (var i = 0, l = before.length; i < l; i++) before[i].apply(this);
		},
		runAfter: function(){
			for (var i = 0, l = after.length; i < l; i++) after[i].apply(this);
			if (parent) parent.runAfter.apply(this);
		}
	};
};

var currentFrame = frame(null, null);

jasmine.Env.prototype.describe = function(description, context){
	currentFrame = frame(currentFrame, description);
	var result = describe.call(this, description, context);
	currentFrame = currentFrame.parent;
	return result;
};
  
jasmine.Env.prototype.it = function(description, closure){
	var result = it.call(this, description, closure),
		currentSpec = this.currentSpec,
		frame = this.jstdFrame = currentFrame,
		name = 'test that it ' + description;

	if (this.jstdFrame.testCase.prototype[name])
		throw "Spec with name '" + description + "' already exists.";
	
	this.jstdFrame.testCase.prototype[name] = function(queue){
		jasmine.getEnv().currentSpec = currentSpec;
		jasmine.getEnv().exceptions = [];
		jasmine.getEnv().errors = [];
		frame.runBefore.apply(currentSpec);
		var onend = function() {
			frame.runAfter.apply(currentSpec);
			// check the results...
			var resultItems = currentSpec.results().getItems();
			var messages = [];
			for ( var i = 0; i < resultItems.length; i++) {
	              if (!resultItems[i].passed()) {
	            	  if (resultItems[i].trace) {
	            		  throw resultItems[i].trace;
	            	  } else {
	            		  fail(resultItems[i].toString());
	            	  }
	              }
            }
			
		};
		queue.call(function(callbacks) {
			onend = callbacks.add(onend);
			currentSpec.queue.start(onend);
		});
	};
	return result;
};

//Patch Jasmine for proper stack traces
jasmine.Spec.prototype.fail = function (e) {
  var expectationResult = new jasmine.ExpectationResult({
    passed: false,
    message: e ? jasmine.util.formatException(e) : 'Exception'
  });
  // PATCH
  if (e) {
    expectationResult.trace = e;
  }
  this.results_.addResult(expectationResult);
};

jasmine.Env.prototype.beforeEach = function(closure) {
	beforeEach.call(this, closure);
	currentFrame.before.push(closure);
};

jasmine.Env.prototype.afterEach = function(closure) {
	afterEach.call(this, closure);
	currentFrame.after.push(closure);
};

// Reset environment with overriden methods.
jasmine.currentEnv_ = null;
jasmine.getEnv();

})(jasmine.Env.prototype.describe, jasmine.Env.prototype.it, jasmine.Env.prototype.beforeEach, jasmine.Env.prototype.afterEach, jasmine.NestedResults.prototype.addResult);
