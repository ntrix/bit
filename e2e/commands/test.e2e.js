// covers also ci-update command

import fs from 'fs-extra';
import path from 'path';
import { expect } from 'chai';
import Helper from '../e2e-helper';

const isTypeFixture = "module.exports = function isType() { return 'got is-type'; };";
const isTypeSpecFixture = testShouldPass => `const expect = require('chai').expect;
const isType = require('./is-type.js');

describe('isType', () => {
  it('should display "got is-type"', () => {
    expect(isType())${testShouldPass ? '' : '.not'}.to.equal('got is-type');
  });
});`;

const isTypeBeforeFailSpecFixture = `const expect = require('chai').expect;
const isType = require('./is-type.js');

describe('isType before hook describe', () => {
  describe('isType before hook internal describe', () => {
    before('failing before"', () => {
      const a = undefinedObj.something;
    });
    it('not running test"', () => {
      expect(isType()).to.equal('got is-type');
    });
  });
  it('should pass test"', () => {
    expect(true).to.equal(true);
  });
});`;

describe('bit test command', function () {
  this.timeout(0);
  const helper = new Helper();
  let clonedScopePath;
  before(() => {
    helper.reInitLocalScope();
    helper.importTester('bit.envs/testers/mocha');
    clonedScopePath = helper.cloneLocalScope();
  });
  after(() => {
    helper.destroyEnv();
    fs.removeSync(clonedScopePath);
  });
  describe('when there are no tests', () => {
    before(() => {
      helper.getClonedLocalScope(clonedScopePath);
      helper.createComponent('utils', 'is-type.js', isTypeFixture);
      helper.addComponent('utils/is-type.js');
    });
    it('should indicate that there are no tests', () => {
      const output = helper.testComponent('utils/is-type');
      expect(output).to.have.string('There are no tests for utils/is-type');
    });
  });

  describe('when tests are passed', () => {
    before(() => {
      helper.getClonedLocalScope(clonedScopePath);
      helper.createComponent('utils', 'is-type.js', isTypeFixture);
      helper.createComponent('utils', 'is-type.spec.js', isTypeSpecFixture(true));
      helper.addComponent('utils/is-type.js -t utils/is-type.spec.js');
    });
    it('should indicate that testes are passed', () => {
      const output = helper.testComponent('utils/is-type');
      expect(output).to.have.string('tests passed');
    });
  });
  describe('when tests are failed', () => {
    before(() => {
      helper.getClonedLocalScope(clonedScopePath);
      helper.createComponent('utils', 'is-type.js', isTypeFixture);
      helper.createComponent('utils', 'is-type.spec.js', isTypeSpecFixture(false));
      helper.addComponent('utils/is-type.js -t utils/is-type.spec.js');
    });
    it('should indicate that testes are failed', () => {
      const output = helper.testComponent('utils/is-type');
      expect(output).to.have.string('tests failed');
    });
  });
  describe('when there is before hook which fail', () => {
    let output;
    before(() => {
      helper.getClonedLocalScope(clonedScopePath);
      helper.createComponent('utils', 'is-type.js', isTypeFixture);
      helper.createComponent('utils', 'is-type.spec.js', isTypeSpecFixture(true));
      helper.createComponent('utils', 'is-type-before-fail.spec.js', isTypeBeforeFailSpecFixture);
      helper.addComponentWithOptions('utils/is-type.js', { t: 'utils/is-type.spec.js,utils/is-type-before-fail.spec.js' });
      output = helper.testComponent('utils/is-type');
    });
    it('should print the error for the before hook failure', () => {
      expect(output).to.have.string('undefinedObj is not defined');
    });
    it('should indicate that testes from the same spec and not in the same describe are passed', () => {
      expect(output).to.have.string('✔   isType before hook describe should pass test');
    });
    it('should indicate that testes are failed if all other tests (except the before) are passed', () => {
      const failedFilePath = path.join('/private', helper.localScopePath, 'utils', 'is-type-before-fail.spec.js');
      expect(output).to.have.string(`tests failed\nfile: ${failedFilePath}`);
    });
    it('should indicate that testes in other specs files are passed', () => {
      const passFilePath = path.join('/private', helper.localScopePath, 'utils', 'is-type.spec.js');
      expect(output).to.have.string(`tests passed\nfile: ${passFilePath}`);
      expect(output).to.have.string('✔   isType should display "got is-type"');
    });
  });
  describe('after importing a component with tests', () => {
    before(() => {
      helper.getClonedLocalScope(clonedScopePath);
      helper.createComponent('utils', 'is-type.js', isTypeFixture);
      helper.createComponent('utils', 'is-type.spec.js', isTypeSpecFixture(true));
      helper.addComponent('utils/is-type.js -t utils/is-type.spec.js');
      helper.commitComponent('utils/is-type');

      helper.reInitRemoteScope();
      helper.addRemoteScope();
      helper.exportComponent('utils/is-type');

      helper.reInitLocalScope();
      helper.addRemoteScope();
      helper.importComponent('utils/is-type');
    });
    it('should import the tester and run the tests successfully', () => {
      const output = helper.testComponent('utils/is-type');
      expect(output).to.have.string('tests passed');
    });
    it('should be able to run the tests on an isolated environment using bit ci-update command', () => {
      const output = helper.runCmd(`bit ci-update ${helper.remoteScope}/utils/is-type`, helper.remoteScopePath);
      expect(output).to.have.string('tests passed');
    });
  });
});
describe('bit component with no tester', function () {
  this.timeout(0);
  const helper = new Helper();
  beforeEach(() => {
    helper.reInitLocalScope();
  });
  after(() => {
    helper.destroyEnv();
  });
  it('Should return not tester message when running test on all components', () => {
    helper.createComponent('bar', 'foo.js');
    helper.addComponent(path.join('bar', 'foo.js'));
    const output = helper.testComponent();
    expect(output).to.have.string('There is no tester for bar/foo');
  });
  it('Should return not tester message when running test on single component', () => {
    helper.createComponent('bar', 'foo.js');
    helper.addComponent(path.join('bar', 'foo.js'));
    const output = helper.testComponent('bar/foo');
    expect(output).to.have.string('There is no tester for bar/foo');
  });
});
