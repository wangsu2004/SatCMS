define(['jquery', 'app', 'jqueryValidate', 'tinyMCE'],

    function ($, app) {

        'use strict';

        /**
         * Options
         */

        var submitHandlerOptions = {
              dataType : 'json'
            , cache: false

            , beforeSubmit: function(options, form) {
                // console.log('before-submit', options);
                // return false;
                // $(form).find('div.panel').css({visibility:'hidden'});
                //console.log($(form).data());

                form.trigger('submitableBefore', [options]);

                // Notify listeners
                if (form.data('notify')) {
                    var listener = $(form.data('notify'));
                    if (listener.size()) {
                        listener.trigger('submitableBefore', [options, form]);
                    } else {
                        console.error('submitHandler: cant find Listner - ' + form.data('notify'));
                    }
                }

                if (!form.data('not-block')) {
                    app.blockUI(1);
                }

                form.find('[data-disable-on-submit]').prop('disabled', true);

            }

            , success: function(data, statusText, xhr, form){

                if (!form.data('not-block')) {
                    setTimeout(function(){
                        app.blockUI(0);
                    }, 400);
                }

                /*
                console.log('form-submit', $form, data, statusText, xhr);
                app.message('form-submit');
                */

                submitHandler(form, data, statusText, xhr);

                //console.log('after-submit');
                /*
                 setTimeout(function(){
                 $(form).find('div.panel').css({visibility:'visible'});
                 }, 3000)
                 */
            }

            , error: function(response, status, xhr, form){
                if (!form.data('not-block')) {
                    app.blockUI(0);
                }
                form.find('[data-disable-on-submit]').prop('disabled', false);
                var message = response.message !== undefined ? response.message : 'Request failed';
                app.message(message, angular.toJson(response));
            }
        };

        var validHandlerOptions = {

            invalidHandler: function(form, validator) {
                var errors = validator.numberOfInvalids();
                if (errors) app.message('Заполните необходимые поля ('+errors+' шт.)', true);
            },

            errorElement: 'span',
            errorClass: 'help-block',

            errorPlacement: function(error, element) {
                if(element.parent('.input-group').length) {
                    error.insertAfter(element.parent());
                } else {
                    error.insertAfter(element);
                }
            },

            highlight: function(element, errorClass, validClass) {
                $(element).parents('.form-block')
                    .removeClass('has-success')
                    .addClass('has-error');
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).parents('.form-block') // control-group
                    .removeClass('has-error')
                    .addClass('has-success');
            }

        };

        /*
         , errorClass: 'help-inline'
         , errorElement: 'span'

         , highlight: function(element, errorClass, validClass) {
         $(element).parents('.control-group').removeClass('success').addClass('error');
         }
         , unhighlight: function(element, errorClass, validClass) {
         $(element).parents('.control-group').removeClass('error').addClass('success');
         }
         , invalidHandler: function(form, validator) {
         var errors = validator.numberOfInvalids();
         if (errors) app.message('Заполните необходимые<br/>поля ('+errors+' шт.)', true);
         }
         */

        function fixMCE(form) {
            $(form).bind('form-pre-serialize', function(e) {
                tinyMCE.triggerSave();
            });
        }

        /**
         * @param form {validable}
         */
        function bindValidatorAjax(form) {

            console.log(bindValidatorAjax);

            $(form).validate(
                $.extend(validHandlerOptions, {
                    submitHandler: function(form) {
                        $(form).ajaxSubmit(submitHandlerOptions);
                    }
                })
            )

            fixMCE(form);
        }

        /**
         * @param form {_validable}
         */
        function bindValidator(form) {
            $(form).validate(
                validHandlerOptions
            );
        }

        /**
         * @param form {submitable}
         */
        function bindSubmitable(form) {

            $(form).submit(function(){
                $(this).ajaxSubmit(
                    submitHandlerOptions
                );
                return false;
            });

            fixMCE(form);
        }

        /**
         * @param form
         * @param data
         */
        function submitHandler (form, data, statusText, xhr) {

            // Notify listeners
            if (form.data('notify')) {
                var listener = $(form.data('notify'));
                if (listener.size()) {
                    listener.trigger('submitableDone', [data, statusText, xhr, form]);
                } else {
                    console.error('submitHandler: cant find Listner - ' + form.data('notify'));
                }
            }

            // Notify form
            form.trigger('submitableDone', [data, statusText, xhr]);

            if (data.status) {

                if (!!data.message) {
                    app.message(data.message);
                }

                if (form.data('successDismiss')) {
                    $('#formModal').modal('hide');
                }

                // @deprecated
                if (!!data.url) {
                    console.log('submitable data-url: ' + data.url);
                    //@todo if not dialog, digest already in process
                    app.go(data.url, true);
                    return;
                }

                console.log('-form-submit.success', data);

                // response.redirect
                if (!!data.redirect) {
                    // @fixme self redirect doesn't work here
                    data.redirect += ((data.redirect.indexOf('?') === -1) ? 'rand/' : '&rand=') + Math.ceil(10000 * Math.random()) + '/';
                    app.go(data.redirect, true);
                    app.message('data.redirect: ' + data.redirect);
                    return;
                }

                // successUrl
                if (form.data('successUrl')) {
                    app.go(form.data('successUrl'), true);
                    app.message('successUrl: ' + form.data('successUrl'));
                    return;
                }

                if (form.data('successReload')) {

                    if (form.data('grid')) {
                        // reload grid
                        $('#grid-' + form.data('grid')).scope().grid.reload();
                    } else {
                        // reload viewport
                        app.ngReload();
                    }
                }



                if (form.data('successCallback')) {
                    // app.ngState().go(form.data('successUrl'));
                }

            }
            else {
                if (!!data.message) {
                    app.message(data.message, !data.result);
                }

                setTimeout(function(){
                    form.find('[data-disable-on-submit]').prop('disabled', false);
                }, 500);

                console.log('-form-submit.error', data);

            }

        }

        //
        // Custom validators

        // jquery validator regex

        $.validator.addMethod(
            "regex",
            function(value, element, regexp) {
                var re = new RegExp(regexp);
                return this.optional(element) || re.test(value);
            },
            "Please check your input."
        );

        // jquery validator domain

        $.validator.addMethod("domain", function(value, element) {
            return this.optional(element) || /^((?:[a-z0-9-]+\.)+(?:[a-z]{2,5}))$/i.test(value);
        }, "Please specify valid domain");

        // datetime

        $.validator.addMethod("datetime", function(value, element) {
            return this.optional(element) || /^[0-9\:\. ]+$/.test(value);
        }, "Please specify valid date and time");

        /**
         * Actual object
         */
        return {

           bindValidatorAjax:   bindValidatorAjax,
           bindValidator:       bindValidator,
           bindSubmitable:      bindSubmitable

        }

    }
);