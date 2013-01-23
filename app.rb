require 'sinatra'

get '/' do
    "hello world"
end

get '/:destination' do |destination|
    @destination = destination
    erb :index, layout: :layout
end