'use strict';

const Sinon = require('sinon');

const Controller = require('../../../../src/plugins/features/dexes/controller');
const Dex        = require('../../../../src/models/dex');
const Errors     = require('../../../../src/libraries/errors');
const Knex       = require('../../../../src/libraries/knex');

const firstUser  = Factory.build('user');
const secondUser = Factory.build('user');

const firstDex  = Factory.build('dex', { user_id: firstUser.id });
const secondDex = Factory.build('dex', { user_id: firstUser.id, title: 'Another', slug: 'another' });

describe('dexes controller', () => {

  describe('retrieve', () => {

    beforeEach(() => {
      return Knex('users').insert(firstUser)
      .then(() => Knex('dexes').insert(firstDex));
    });

    it('returns a dex from the username and slug', () => {
      return Controller.retrieve({ username: firstUser.username, slug: firstDex.slug })
      .then((dex) => {
        expect(dex.id).to.eql(firstDex.id);
      });
    });

    it('rejects if the username does not match with the slug', () => {
      return Controller.retrieve({ username: 'bad_username', slug: firstDex.slug })
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

    it('rejects if the slug does not match with the username', () => {
      return Controller.retrieve({ username: firstUser.username, slug: 'bad-slug' })
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

  });

  describe('create', () => {

    const firstParams  = { username: firstUser.username };
    const secondParams = { username: secondUser.username };
    const title = 'Test';
    const shiny = false;
    const generation = 6;

    beforeEach(() => {
      return Knex('users').insert(firstUser);
    });

    it('saves a dex', () => {
      return Controller.create(firstParams, { title, shiny, generation }, firstUser)
      .then((dex) => new Dex({ id: dex.get('id') }).fetch())
      .then((dex) => {
        expect(dex.get('title')).to.eql(title);
        expect(dex.get('shiny')).to.eql(shiny);
        expect(dex.get('generation')).to.eql(generation);
      });
    });

    it('rejects if trying to create a dex for another user', () => {
      return Controller.create(secondParams, { title, shiny, generation }, firstUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.ForbiddenAction);
      });
    });

    it('rejects if the title is already taken by the user', () => {
      return Knex('dexes').insert(firstDex)
      .then(() => Controller.create(firstParams, { title: firstDex.title, shiny, generation }, firstUser))
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.ExistingDex);
      });
    });

    it('rejects if the username is taken after the fetch', () => {
      Sinon.stub(Dex.prototype, 'save').throws(new Error('duplicate key value'));

      return Controller.create(firstParams, { title, shiny, generation }, firstUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.ExistingDex);
      })
      .finally(() => {
        Dex.prototype.save.restore();
      });
    });

  });

  describe('update', () => {

    const firstParams  = { username: firstUser.username, slug: firstDex.slug };
    const secondParams = { username: secondUser.username, slug: 'other' };
    const title = 'Test';
    const shiny = true;

    beforeEach(() => {
      return Knex('users').insert([firstUser, secondUser])
      .then(() => Knex('dexes').insert([firstDex, secondDex]));
    });

    it('updates a dex', () => {
      return Controller.update(firstParams, { shiny }, firstUser)
      .then((dex) => new Dex({ id: dex.get('id') }).fetch())
      .then((dex) => {
        expect(dex.get('shiny')).to.eql(shiny);
      });
    });

    it('updates the slug if the title is also being updated', () => {
      return Controller.update(firstParams, { title }, firstUser)
      .then((dex) => new Dex({ id: dex.get('id') }).fetch())
      .then((dex) => {
        expect(dex.get('title')).to.eql(title);
        expect(dex.get('slug')).to.eql('test');
      });
    });

    it('rejects if trying to update a dex for another user', () => {
      return Controller.update(secondParams, { title }, firstUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.ForbiddenAction);
      });
    });

    it('rejects if the dex does not exist', () => {
      return Controller.update(secondParams, { title }, secondUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

    it('rejects if the title is already taken by the user', () => {
      return Controller.update(firstParams, { title: secondDex.title }, firstUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.ExistingDex);
      });
    });

  });

  describe('delete', () => {

    const firstParams  = { username: firstUser.username, slug: firstDex.slug };
    const secondParams = { username: secondUser.username, slug: 'other' };

    beforeEach(() => {
      return Knex('users').insert([firstUser, secondUser])
      .then(() => Knex('dexes').insert([firstDex, secondDex]));
    });

    it('deletes a dex', () => {
      return Controller.delete(firstParams, firstUser)
      .then(() => new Dex({ id: firstDex.id }).fetch())
      .then((dex) => {
        expect(dex).to.not.exist;
      });
    });

    it('rejects if trying to delete a dex for another user', () => {
      return Controller.delete(secondParams, firstUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.ForbiddenAction);
      });
    });

    it('rejects if the dex does not exist', () => {
      return Controller.delete(secondParams, secondUser)
      .catch((err) => err)
      .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

  });

});
